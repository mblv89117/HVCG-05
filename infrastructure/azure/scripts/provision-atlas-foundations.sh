#!/usr/bin/env bash
# Provision / align Project Atlas Azure foundations on HVCG Production.
# Permanent subscription: ebc84d85-b5ff-4c4b-add1-b0a8de31b319
# DEPRECATED — never use: 866189c6-5aa0-4037-8094-05771caceb0d
set -euo pipefail

export PATH="${HOME}/Library/Python/3.9/bin:${PATH}"
export AZURE_CORE_ONLY_SHOW_ERRORS=true

SUB_ID="ebc84d85-b5ff-4c4b-add1-b0a8de31b319"
SUB_NAME="HVCG Production"
LOC="westus3"
KV_NAME="kv-atlas-hvcg-ebc84d85"
LAW_NAME="law-atlas-prod"
APPI_NAME="appi-atlas-prod"
MI_NAME="id-atlas-prod"
SWA_NAME="swa-atlas-elite-os-dev"
BUDGET_NAME="budget-atlas-100"
OWNER_EMAIL="manny@highvaluecapitalgroup.com"

az account set --subscription "$SUB_ID"
ACTIVE=$(az account show --query id -o tsv)
if [[ "$ACTIVE" != "$SUB_ID" ]]; then
  echo "FATAL: Active subscription is $ACTIVE, expected $SUB_ID ($SUB_NAME)"
  exit 1
fi
echo "Using $SUB_NAME ($SUB_ID) in $LOC"

register_providers() {
  local providers=(
    Microsoft.KeyVault Microsoft.Insights Microsoft.OperationalInsights
    Microsoft.Web Microsoft.ManagedIdentity Microsoft.Network Microsoft.Storage
    Microsoft.AlertsManagement Microsoft.Consumption Microsoft.CostManagement
    Microsoft.Security
  )
  for p in "${providers[@]}"; do
    state=$(az provider show -n "$p" --query registrationState -o tsv 2>/dev/null || echo "Unknown")
    if [[ "$state" != "Registered" ]]; then
      echo "Registering $p (was $state) — async, no wait..."
      az provider register --namespace "$p" >/dev/null || true
    else
      echo "OK $p"
    fi
  done
}

tag_rg() {
  local name="$1" env="$2"
  az group create -n "$name" -l "$LOC" --output none 2>/dev/null || true
  az group update -n "$name" --set \
    tags.Company=HVCG \
    tags.Application="Project Atlas" \
    tags.Project=Atlas \
    tags.Environment="$env" \
    tags.Owner="Manuel Barela" \
    tags.Platform=Microsoft \
    tags.ManagedBy=Azure \
    --output none
  echo "RG $name tagged ($env)"
}

ensure_rgs() {
  tag_rg rg-atlas-dev Development
  tag_rg rg-atlas-prod Production
  tag_rg rg-atlas-shared Shared
  tag_rg rg-atlas-network Shared
  tag_rg rg-atlas-security Production
  tag_rg rg-atlas-monitoring Production
}

ensure_law() {
  if az monitor log-analytics workspace show -g rg-atlas-monitoring -n "$LAW_NAME" &>/dev/null; then
    echo "LAW exists: $LAW_NAME"
  else
    az monitor log-analytics workspace create \
      -g rg-atlas-monitoring -n "$LAW_NAME" -l "$LOC" --retention-time 30 \
      --tags Company=HVCG Application="Project Atlas" Project=Atlas Environment=Production \
             Owner="Manuel Barela" Platform=Microsoft ManagedBy=Azure \
      --output none
    echo "Created LAW $LAW_NAME"
  fi
}

ensure_appi() {
  LAW_ID=$(az monitor log-analytics workspace show -g rg-atlas-monitoring -n "$LAW_NAME" --query id -o tsv)
  if az monitor app-insights component show -g rg-atlas-monitoring -a "$APPI_NAME" &>/dev/null; then
    echo "App Insights exists: $APPI_NAME"
  else
    az monitor app-insights component create \
      -g rg-atlas-monitoring -a "$APPI_NAME" -l "$LOC" --kind web \
      --workspace "$LAW_ID" \
      --tags Company=HVCG Application="Project Atlas" Project=Atlas Environment=Production \
             Owner="Manuel Barela" Platform=Microsoft ManagedBy=Azure \
      --output none
    echo "Created App Insights $APPI_NAME"
  fi
}

ensure_kv() {
  if az keyvault show -n "$KV_NAME" -g rg-atlas-security &>/dev/null; then
    echo "Key Vault exists: $KV_NAME"
  else
    az keyvault create \
      -n "$KV_NAME" -g rg-atlas-security -l "$LOC" \
      --enable-rbac-authorization true --retention-days 7 \
      --enable-purge-protection true \
      --tags Company=HVCG Application="Project Atlas" Project=Atlas Environment=Production \
             Owner="Manuel Barela" Platform=Microsoft ManagedBy=Azure \
      --output none
    echo "Created Key Vault $KV_NAME"
  fi
  # Soft-delete is always on for new vaults; purge protection is irreversible once enabled
  PURGE=$(az keyvault show -n "$KV_NAME" -g rg-atlas-security --query properties.enablePurgeProtection -o tsv)
  if [[ "$PURGE" != "true" ]]; then
    az keyvault update -n "$KV_NAME" -g rg-atlas-security --enable-purge-protection true --output none
    echo "Enabled purge protection on $KV_NAME"
  else
    echo "Purge protection OK: $KV_NAME"
  fi
  # Owner gets Key Vault Administrator for secret ops
  OWNER_OID=$(az ad signed-in-user show --query id -o tsv)
  KV_ID=$(az keyvault show -n "$KV_NAME" -g rg-atlas-security --query id -o tsv)
  az role assignment create --assignee-object-id "$OWNER_OID" --assignee-principal-type User \
    --role "Key Vault Administrator" --scope "$KV_ID" --output none 2>/dev/null || true
}

ensure_mi() {
  if az identity show -n "$MI_NAME" -g rg-atlas-shared &>/dev/null; then
    echo "Managed Identity exists: $MI_NAME"
  else
    az identity create -n "$MI_NAME" -g rg-atlas-shared -l "$LOC" \
      --tags Company=HVCG Application="Project Atlas" Project=Atlas Environment=Production \
             Owner="Manuel Barela" Platform=Microsoft ManagedBy=Azure \
      --output none
    echo "Created MI $MI_NAME"
  fi
  MI_PID=$(az identity show -n "$MI_NAME" -g rg-atlas-shared --query principalId -o tsv)
  KV_ID=$(az keyvault show -n "$KV_NAME" -g rg-atlas-security --query id -o tsv)
  az role assignment create --assignee-object-id "$MI_PID" --assignee-principal-type ServicePrincipal \
    --role "Key Vault Secrets User" --scope "$KV_ID" --output none 2>/dev/null || true
}

ensure_swa() {
  if az staticwebapp show -n "$SWA_NAME" -g rg-atlas-dev &>/dev/null; then
    echo "SWA exists: $SWA_NAME"
  else
    # Free SWA supported regions differ from RG location; prefer westus2
    az staticwebapp create \
      -n "$SWA_NAME" -g rg-atlas-dev -l westus2 \
      --sku Free \
      --tags Company=HVCG Application="Project Atlas" Project=Atlas Environment=Development \
             Owner="Manuel Barela" Platform=Microsoft ManagedBy=Azure \
      --output none
    echo "Created SWA $SWA_NAME"
  fi
  az staticwebapp show -n "$SWA_NAME" -g rg-atlas-dev --query "{name:name,url:defaultHostname,sku:sku.name}" -o json
}

ensure_budget() {
  START=$(date -u +%Y-%m-01T00:00:00Z)
  # End = start + ~1 year (API requires endDate)
  END=$(date -u -v+1y +%Y-%m-01T00:00:00Z 2>/dev/null || date -u -d '+1 year' +%Y-%m-01T00:00:00Z)
  SCOPE="/subscriptions/${SUB_ID}"
  cat > /tmp/atlas-budget.json <<EOF
{
  "properties": {
    "category": "Cost",
    "amount": 100,
    "timeGrain": "Monthly",
    "timePeriod": { "startDate": "${START}", "endDate": "${END}" },
    "notifications": {
      "Actual_GreaterThan_50_Percent": {
        "enabled": true, "operator": "GreaterThan", "threshold": 50,
        "contactEmails": ["${OWNER_EMAIL}"], "thresholdType": "Actual"
      },
      "Actual_GreaterThan_75_Percent": {
        "enabled": true, "operator": "GreaterThan", "threshold": 75,
        "contactEmails": ["${OWNER_EMAIL}"], "thresholdType": "Actual"
      },
      "Actual_GreaterThan_90_Percent": {
        "enabled": true, "operator": "GreaterThan", "threshold": 90,
        "contactEmails": ["${OWNER_EMAIL}"], "thresholdType": "Actual"
      },
      "Actual_GreaterThan_100_Percent": {
        "enabled": true, "operator": "GreaterThan", "threshold": 100,
        "contactEmails": ["${OWNER_EMAIL}"], "thresholdType": "Actual"
      }
    }
  }
}
EOF
  az rest --method put \
    --url "https://management.azure.com${SCOPE}/providers/Microsoft.Consumption/budgets/${BUDGET_NAME}?api-version=2023-11-01" \
    --body @/tmp/atlas-budget.json \
    --output none && echo "Budget $BUDGET_NAME configured (\$100/mo, alerts 50/75/90/100%)" \
    || echo "WARN: Budget API call failed — create manually in Cost Management if needed"
}

ensure_action_group() {
  if az monitor action-group show -g rg-atlas-monitoring -n ag-atlas-ops &>/dev/null; then
    echo "Action group exists: ag-atlas-ops"
  else
    az monitor action-group create -g rg-atlas-monitoring -n ag-atlas-ops \
      --short-name AtlasOps \
      --action email OwnerAlert "$OWNER_EMAIL" \
      --tags Company=HVCG Application="Project Atlas" Project=Atlas Environment=Production \
             Owner="Manuel Barela" Platform=Microsoft ManagedBy=Azure \
      --output none
    echo "Created action group ag-atlas-ops"
  fi
}

main() {
  register_providers
  ensure_rgs
  ensure_law
  ensure_appi
  ensure_kv
  ensure_mi
  ensure_action_group
  ensure_budget
  ensure_swa
  echo ""
  echo "=== Sprint 11 provision summary ==="
  az resource list --query "[].{name:name,type:type,rg:resourceGroup}" -o table
}

main "$@"
