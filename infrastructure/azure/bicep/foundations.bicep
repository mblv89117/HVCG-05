// Atlas monitoring + security foundations (deploy into existing RGs)

param location string = 'westus3'
param logAnalyticsName string = 'law-atlas-prod'
param appInsightsName string = 'appi-atlas-prod'
param keyVaultName string
param managedIdentityName string = 'id-atlas-prod'
param monitoringRg string = 'rg-atlas-monitoring'
param securityRg string = 'rg-atlas-security'
param sharedRg string = 'rg-atlas-shared'

var tags = {
  Company: 'HVCG'
  Application: 'Project Atlas'
  Project: 'Atlas'
  Environment: 'Production'
  Owner: 'Manuel Barela'
  Platform: 'Microsoft'
  ManagedBy: 'Azure'
}

resource law 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: law.id
    IngestionMode: 'LogAnalytics'
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: keyVaultName
  location: location
  tags: tags
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableRbacAuthorization: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    enablePurgeProtection: true
    publicNetworkAccess: 'Enabled'
  }
}

resource mi 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: managedIdentityName
  location: location
  tags: tags
}

output logAnalyticsId string = law.id
output appInsightsConnectionString string = appi.properties.ConnectionString
output keyVaultUri string = kv.properties.vaultUri
output managedIdentityPrincipalId string = mi.properties.principalId
output managedIdentityClientId string = mi.properties.clientId
