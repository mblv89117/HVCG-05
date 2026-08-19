#!/usr/bin/env bash
# Verify Dataverse Web API CORS preflight for Elite OS origins (Dev).
set -euo pipefail

DV_URL="${DATAVERSE_URL:-https://org1131a2b0.crm.dynamics.com}"
API="${DV_URL%/}/api/data/v9.2/WhoAmI"

ORIGINS=(
  "http://127.0.0.1:5180"
  "http://localhost:5180"
  "https://zealous-rock-0090c7e1e.7.azurestaticapps.net"
)

pass=0
fail=0

echo "Dataverse: ${DV_URL}"
echo "Endpoint:  ${API}"
echo

for origin in "${ORIGINS[@]}"; do
  headers="$(curl -sI -X OPTIONS "${API}" \
    -H "Origin: ${origin}" \
    -H "Access-Control-Request-Method: GET" \
    -H "Access-Control-Request-Headers: authorization,content-type,odata-maxversion,odata-version")"
  status="$(printf '%s\n' "${headers}" | head -1 | tr -d '\r')"
  acao="$(printf '%s\n' "${headers}" | awk -F': ' 'tolower($1)=="access-control-allow-origin"{print $2}' | tr -d '\r')"
  if [[ "${status}" == *"200"* ]] && [[ -n "${acao}" ]]; then
    echo "PASS  ${origin}  →  ${acao}  (${status})"
    pass=$((pass + 1))
  else
    echo "FAIL  ${origin}  →  acao='${acao}'  (${status})"
    fail=$((fail + 1))
  fi
done

echo
echo "Summary: ${pass} pass / ${fail} fail"
[[ "${fail}" -eq 0 ]]
