@description('Atlas Integration Hub App Service (Node)')
param location string = 'westus3'
param appName string = 'app-atlas-integration-hub'
param appServicePlanName string = 'asp-atlas-integration-hub'
param managedIdentityName string = 'id-atlas-prod'
param managedIdentityRg string = 'rg-atlas-shared'
param keyVaultName string = 'kv-atlas-hvcg-ebc84d85'
param keyVaultRg string = 'rg-atlas-security'
param appInsightsName string = 'appi-atlas-prod'
param appInsightsRg string = 'rg-atlas-monitoring'
param swaOrigin string = 'https://zealous-rock-0090c7e1e.7.azurestaticapps.net'
param microsoftTenantId string
param microsoftClientId string = ''
param skuName string = 'B1'

var tags = {
  Company: 'HVCG'
  Application: 'Project Atlas'
  Project: 'Atlas'
  Environment: 'Production'
  Owner: 'Manuel Barela'
  Platform: 'Microsoft'
  ManagedBy: 'Azure'
  Component: 'IntegrationHub'
}

resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: skuName
    tier: 'Basic'
    capacity: 1
  }
  kind: 'linux'
  properties: {
    reserved: true
  }
}

resource mi 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' existing = {
  name: managedIdentityName
  scope: resourceGroup(managedIdentityRg)
}

resource appi 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
  scope: resourceGroup(appInsightsRg)
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
  scope: resourceGroup(keyVaultRg)
}

resource web 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${mi.id}': {}
    }
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|22-lts'
      alwaysOn: true
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'true' }
        { name: 'NODE_ENV', value: 'production' }
        { name: 'INTEGRATION_API_PORT', value: '8080' }
        { name: 'PORT', value: '8080' }
        { name: 'PUBLIC_BASE_URL', value: 'https://${appName}.azurewebsites.net' }
        { name: 'INTEGRATION_REQUIRE_AUTH', value: 'true' }
        { name: 'INTEGRATION_ALLOWED_ORIGINS', value: '${swaOrigin},http://127.0.0.1:5180,http://localhost:5180' }
        { name: 'MICROSOFT_TENANT_ID', value: microsoftTenantId }
        { name: 'MICROSOFT_CLIENT_ID', value: microsoftClientId }
        { name: 'MICROSOFT_REDIRECT_URI', value: 'https://${appName}.azurewebsites.net/api/oauth/microsoft/callback' }
        { name: 'INTEGRATION_DATA_DIR', value: '/home/webapp_data/integrations' }
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: appi.properties.InstrumentationKey }
        { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
        { name: 'KeyVaultUri', value: kv.properties.vaultUri }
        // Secrets resolved at deploy time into app settings from Key Vault references where possible
        { name: 'INTEGRATION_ALLOW_EPHEMERAL_KEY', value: '0' }
      ]
      cors: {
        allowedOrigins: [
          swaOrigin
          'http://127.0.0.1:5180'
          'http://localhost:5180'
        ]
        supportCredentials: true
      }
      healthCheckPath: '/health'
    }
  }
}

output defaultHostName string = web.properties.defaultHostName
output webAppId string = web.id
output webAppName string = web.name
output publicUrl string = 'https://${web.properties.defaultHostName}'
output healthUrl string = 'https://${web.properties.defaultHostName}/health'
