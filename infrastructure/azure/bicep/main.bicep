// Project Atlas — foundation resources on HVCG Production
// Subscription: ebc84d85-b5ff-4c4b-add1-b0a8de31b319
// Location default: westus3

targetScope = 'subscription'

@description('Azure region for Atlas resources')
param location string = 'westus3'

@description('Environment label for tags')
@allowed(['Development', 'Production', 'Shared'])
param environment string = 'Production'

@description('Monthly budget amount USD')
param budgetAmount int = 100

@description('Budget alert email')
param budgetContactEmail string = 'manny@highvaluecapitalgroup.com'

var tags = {
  Company: 'HVCG'
  Application: 'Project Atlas'
  Project: 'Atlas'
  Environment: environment
  Owner: 'Manuel Barela'
  Platform: 'Microsoft'
  ManagedBy: 'Azure'
}

var resourceGroups = [
  { name: 'rg-atlas-dev', env: 'Development' }
  { name: 'rg-atlas-prod', env: 'Production' }
  { name: 'rg-atlas-shared', env: 'Shared' }
  { name: 'rg-atlas-network', env: 'Shared' }
  { name: 'rg-atlas-security', env: 'Production' }
  { name: 'rg-atlas-monitoring', env: 'Production' }
]

resource rgs 'Microsoft.Resources/resourceGroups@2024-03-01' = [for rg in resourceGroups: {
  name: rg.name
  location: location
  tags: union(tags, { Environment: rg.env })
}]
