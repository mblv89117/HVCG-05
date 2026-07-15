#Requires -Version 7.0
<#
.SYNOPSIS
  HVCG Deployment helper module (Development orchestration).
#>

Set-StrictMode -Version Latest

function Write-HVCGLog {
  param(
    [ValidateSet('INFO','WARN','ERROR','SUCCESS','STEP')]
    [string]$Level = 'INFO',
    [string]$Message,
    [object]$Report
  )
  $ts = (Get-Date).ToString('s')
  $line = "[$ts][$Level] $Message"
  switch ($Level) {
    'ERROR'   { Write-Host $line -ForegroundColor Red }
    'WARN'    { Write-Host $line -ForegroundColor Yellow }
    'SUCCESS' { Write-Host $line -ForegroundColor Green }
    'STEP'    { Write-Host $line -ForegroundColor Cyan }
    default   { Write-Host $line }
  }
  if ($null -ne $Report) {
    $Report.Log += $line
    if ($Level -eq 'ERROR') { $Report.Errors += $Message }
    if ($Level -eq 'WARN')  { $Report.Warnings += $Message }
  }
}

function New-HVCGDeploymentReport {
  param([string]$Environment, [string]$RepoRoot)
  [pscustomobject]@{
    DeploymentDateTime = (Get-Date).ToString('o')
    Environment        = $Environment
    Tenant             = $null
    RepoRoot           = $RepoRoot
    ResourcesCreated   = [System.Collections.Generic.List[string]]::new()
    ResourcesUpdated   = [System.Collections.Generic.List[string]]::new()
    ResourcesSkipped   = [System.Collections.Generic.List[string]]::new()
    Errors             = [System.Collections.Generic.List[string]]::new()
    Warnings           = [System.Collections.Generic.List[string]]::new()
    TestResults        = $null
    OwnerActionsRemaining = [System.Collections.Generic.List[string]]::new()
    NextStep           = $null
    Log                = [System.Collections.Generic.List[string]]::new()
    Success            = $false
  }
}

function Test-HVCGPlaceholder {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $true }
  return ($Value -match 'REQUIRED_SET_ME' -or $Value -eq 'REQUIRED' -or $Value -match 'REQUIRED\.')
}

function Get-HVCGNestedValue {
  param($Object, [string]$Path)
  $node = $Object
  foreach ($part in $Path.Split('.')) {
    if ($null -eq $node) { return $null }
    $node = $node.$part
  }
  return $node
}

function Assert-HVCGConfig {
  param($Config, $Report)
  $missing = @()
  foreach ($path in $Config.requiredFields) {
    $val = Get-HVCGNestedValue -Object $Config -Path $path
    if (Test-HVCGPlaceholder -Value ([string]$val)) {
      $missing += $path
    }
  }
  if ($missing.Count -gt 0) {
    throw "Configuration incomplete. Set these values in development.json: $($missing -join ', ')"
  }
  Write-HVCGLog -Level SUCCESS -Message "Configuration validation passed." -Report $Report
}

function Initialize-HVCGDevConfig {
  param(
    [string]$RepoRoot,
    [switch]$NonInteractive,
    [hashtable]$Overrides
  )
  $example = Join-Path $RepoRoot 'config/environments/development.example.json'
  $target  = Join-Path $RepoRoot 'config/environments/development.json'
  if (-not (Test-Path $target)) {
    Copy-Item $example $target
  }
  $cfg = Get-Content $target -Raw | ConvertFrom-Json

  if ($Overrides) {
    if ($Overrides.ContainsKey('TenantDomain')) {
      $domain = $Overrides.TenantDomain
      $cfg.tenant.domain = $domain
      $cfg.tenant.sharePointRoot = "https://$($domain.Replace('.onmicrosoft.com','').Split('.')[0]).sharepoint.com"
      if ($domain -match '\.onmicrosoft\.com$') {
        $tenantName = $domain.Replace('.onmicrosoft.com','')
      } else {
        $tenantName = $domain.Split('.')[0]
        $cfg.tenant.sharePointRoot = "https://$tenantName.sharepoint.com"
      }
      # Prefer explicit override of root if classic tenant name provided separately
      $cfg.tenant.sharePointAdminUrl = ($cfg.tenant.sharePointRoot -replace '\.sharepoint\.com', '-admin.sharepoint.com')
      foreach ($siteKey in @('commandCenter','knowledgeCenter','clientsHub','secureDataRooms')) {
        $site = $cfg.sites.$siteKey
        if ($null -ne $site -and $site.alias) {
          $site.url = "$($cfg.tenant.sharePointRoot)/sites/$($site.alias)"
        }
      }
    }
    if ($Overrides.ContainsKey('ExecutiveUpn')) {
      $cfg.identities.executiveUpn = $Overrides.ExecutiveUpn
      $cfg.identities.siteOwnerUpn = $Overrides.ExecutiveUpn
      $cfg.identities.notificationMailbox = $Overrides.ExecutiveUpn
      if (-not $Overrides.ContainsKey('OperationsManagerUpn')) {
        $cfg.identities.operationsManagerUpn = $Overrides.ExecutiveUpn
      }
    }
    if ($Overrides.ContainsKey('OperationsManagerUpn')) {
      $cfg.identities.operationsManagerUpn = $Overrides.OperationsManagerUpn
    }
    if ($Overrides.ContainsKey('SharePointRoot')) {
      $cfg.tenant.sharePointRoot = $Overrides.SharePointRoot
      $cfg.tenant.sharePointAdminUrl = ($Overrides.SharePointRoot -replace '\.sharepoint\.com', '-admin.sharepoint.com')
      foreach ($siteKey in @('commandCenter','knowledgeCenter','clientsHub','secureDataRooms')) {
        $site = $cfg.sites.$siteKey
        if ($null -ne $site -and $site.alias) {
          $site.url = "$($cfg.tenant.sharePointRoot)/sites/$($site.alias)"
        }
      }
    }
  }

  if (-not $NonInteractive) {
    if (Test-HVCGPlaceholder $cfg.tenant.domain) {
      $d = Read-Host "Enter tenant domain (e.g. contoso.onmicrosoft.com or contoso.com)"
      $cfg.tenant.domain = $d
      $nameGuess = if ($d -match '^(.*?)\.onmicrosoft\.com$') { $Matches[1] } else { ($d -split '\.')[0] }
      $sp = Read-Host "Enter SharePoint root URL (e.g. https://$nameGuess.sharepoint.com)"
      $cfg.tenant.sharePointRoot = $sp.TrimEnd('/')
      $cfg.tenant.sharePointAdminUrl = ($cfg.tenant.sharePointRoot -replace '\.sharepoint\.com', '-admin.sharepoint.com')
      foreach ($siteKey in @('commandCenter','knowledgeCenter','clientsHub','secureDataRooms')) {
        $site = $cfg.sites.$siteKey
        if ($null -ne $site -and $site.alias) {
          $site.url = "$($cfg.tenant.sharePointRoot)/sites/$($site.alias)"
        }
      }
    }
    if (Test-HVCGPlaceholder $cfg.identities.executiveUpn) {
      $u = Read-Host "Enter your admin/executive UPN (Manny or Global Admin who is deploying)"
      $cfg.identities.executiveUpn = $u
      $cfg.identities.siteOwnerUpn = $u
      $cfg.identities.notificationMailbox = $u
      $cfg.identities.operationsManagerUpn = $u
    }
  }

  ($cfg | ConvertTo-Json -Depth 12) | Set-Content -Path $target -Encoding UTF8
  return Get-Content $target -Raw | ConvertFrom-Json
}

function Install-HVCGModules {
  param($Report, [switch]$WhatIf)
  $modules = @(
    @{ Name = 'PnP.PowerShell'; Min = '2.0.0' },
    @{ Name = 'Microsoft.Graph'; Min = '2.0.0' }
  )
  foreach ($m in $modules) {
    $installed = Get-Module -ListAvailable -Name $m.Name | Sort-Object Version -Descending | Select-Object -First 1
    if (-not $installed) {
      Write-HVCGLog -Level STEP -Message "Installing module $($m.Name)..." -Report $Report
      if ($WhatIf) {
        Write-HVCGLog -Level INFO -Message "WhatIf: would install $($m.Name)" -Report $Report
        continue
      }
      Install-Module -Name $m.Name -Scope CurrentUser -Force -AllowClobber -ErrorAction Stop
      $Report.ResourcesCreated.Add("PSModule:$($m.Name)")
    }
    else {
      Write-HVCGLog -Level INFO -Message "Module present: $($m.Name) $($installed.Version)" -Report $Report
      $Report.ResourcesSkipped.Add("PSModule:$($m.Name)")
    }
    Import-Module $m.Name -ErrorAction Stop
  }
}

function Connect-HVCGGraphInteractive {
  param($Report)
  Write-HVCGLog -Level STEP -Message "Connecting to Microsoft Graph (interactive). Approve consent if prompted." -Report $Report
  Connect-MgGraph -Scopes @(
    'Group.ReadWrite.All',
    'Directory.Read.All',
    'User.Read.All',
    'Sites.FullControl.All',
    'Organization.Read.All'
  ) -NoWelcome | Out-Null
  $ctx = Get-MgContext
  $Report.Tenant = $ctx.TenantId
  Write-HVCGLog -Level SUCCESS -Message "Graph connected. TenantId=$($ctx.TenantId) Account=$($ctx.Account)" -Report $Report
  return $ctx
}

function Ensure-HVCGEntraGroups {
  param($Config, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Ensuring Entra security groups..." -Report $Report
  $me = (Get-MgContext).Account
  foreach ($name in $Config.groups.roleGroups) {
    $existing = Get-MgGroup -Filter "displayName eq '$name'" -ConsistencyLevel eventual -CountVariable c -ErrorAction SilentlyContinue
    if ($existing) {
      Write-HVCGLog -Level INFO -Message "Group exists: $name" -Report $Report
      $Report.ResourcesSkipped.Add("Group:$name")
      $group = @($existing)[0]
    }
    else {
      if ($WhatIf) {
        Write-HVCGLog -Level INFO -Message "WhatIf: create group $name" -Report $Report
        continue
      }
      $nick = ($name -replace '[^a-zA-Z0-9]', '')
      if ($nick.Length -gt 64) { $nick = $nick.Substring(0, 64) }
      $group = New-MgGroup -DisplayName $name -MailEnabled:$false -MailNickname $nick -SecurityEnabled -GroupTypes @()
      Write-HVCGLog -Level SUCCESS -Message "Created group: $name" -Report $Report
      $Report.ResourcesCreated.Add("Group:$name")
    }
  }

  # Add deploying user to Dev elevated roles
  if ($WhatIf) { return }
  $user = Get-MgUser -UserId $me -ErrorAction SilentlyContinue
  if (-not $user) {
    Write-HVCGLog -Level WARN -Message "Could not resolve deploying user $me for group membership." -Report $Report
    return
  }
  foreach ($roleName in $Config.groups.addDeployingUserToRoles) {
    $g = @(Get-MgGroup -Filter "displayName eq '$roleName'" -ErrorAction SilentlyContinue)[0]
    if (-not $g) { continue }
    try {
      $members = Get-MgGroupMember -GroupId $g.Id -All -ErrorAction SilentlyContinue
      if ($members | Where-Object { $_.Id -eq $user.Id }) {
        $Report.ResourcesSkipped.Add("GroupMember:${roleName}:${me}")
      }
      else {
        New-MgGroupMember -GroupId $g.Id -DirectoryObjectId $user.Id -ErrorAction Stop
        $Report.ResourcesCreated.Add("GroupMember:${roleName}:${me}")
        Write-HVCGLog -Level SUCCESS -Message "Added $me to $roleName" -Report $Report
      }
    }
    catch {
      Write-HVCGLog -Level WARN -Message "Could not add $me to $roleName : $($_.Exception.Message)" -Report $Report
    }
  }
}

function Ensure-HVCGSite {
  param(
    $SiteCfg,
    [string]$OwnerUpn,
    [string]$AdminUrl,
    $Report,
    [switch]$WhatIf,
    [switch]$SecurityCritical
  )
  if (-not $SiteCfg -or -not $SiteCfg.alias) { return $null }
  if ($SiteCfg.enabled -eq $false) {
    Write-HVCGLog -Level INFO -Message "Site disabled in config: $($SiteCfg.alias)" -Report $Report
    $Report.ResourcesSkipped.Add("Site:$($SiteCfg.alias):disabled")
    return $null
  }

  Write-HVCGLog -Level STEP -Message "Ensuring site $($SiteCfg.title) ($($SiteCfg.url))" -Report $Report
  try {
    Connect-PnPOnline -Url $AdminUrl -Interactive -ErrorAction Stop
  }
  catch {
    # Fallback: connect to root
    Write-HVCGLog -Level WARN -Message "Admin center connect failed; trying SharePoint root interactive." -Report $Report
    $root = ($SiteCfg.url -replace '/sites/.*','')
    Connect-PnPOnline -Url $root -Interactive -ErrorAction Stop
  }

  $exists = $false
  try {
    Connect-PnPOnline -Url $SiteCfg.url -Interactive -ErrorAction Stop
    $web = Get-PnPWeb -ErrorAction Stop
    if ($web) { $exists = $true }
  }
  catch {
    $exists = $false
  }

  if ($exists) {
    Write-HVCGLog -Level INFO -Message "Site exists: $($SiteCfg.url)" -Report $Report
    $Report.ResourcesSkipped.Add("Site:$($SiteCfg.alias)")
  }
  else {
    if ($WhatIf) {
      Write-HVCGLog -Level INFO -Message "WhatIf: create site $($SiteCfg.alias)" -Report $Report
      return $SiteCfg.url
    }
    try {
      Connect-PnPOnline -Url $AdminUrl -Interactive -ErrorAction Stop
      New-PnPTenantSite -Title $SiteCfg.title -Url $SiteCfg.url -Owner $OwnerUpn -TimeZone 13 -Wait -ErrorAction Stop | Out-Null
      Write-HVCGLog -Level SUCCESS -Message "Created site $($SiteCfg.url)" -Report $Report
      $Report.ResourcesCreated.Add("Site:$($SiteCfg.alias)")
    }
    catch {
      $msg = "Failed creating site $($SiteCfg.alias): $($_.Exception.Message)"
      Write-HVCGLog -Level ERROR -Message $msg -Report $Report
      if ($SecurityCritical) { throw $msg }
    }
  }

  # Harden sharing for Dev
  try {
    Connect-PnPOnline -Url $SiteCfg.url -Interactive -ErrorAction Stop
    Set-PnPSite -Identity $SiteCfg.url -SharingCapability Disabled -ErrorAction SilentlyContinue
    Write-HVCGLog -Level SUCCESS -Message "Sharing disabled on Dev site $($SiteCfg.alias)" -Report $Report
    $Report.ResourcesUpdated.Add("SiteSharing:$($SiteCfg.alias):Disabled")
  }
  catch {
    Write-HVCGLog -Level WARN -Message "Could not set SharingCapability on $($SiteCfg.alias): $($_.Exception.Message)" -Report $Report
  }

  return $SiteCfg.url
}

function Get-HVCGPnPFieldType {
  param([string]$Type)
  switch ($Type) {
    'Text' { 'Text' }
    'Note' { 'Note' }
    'Choice' { 'Choice' }
    'Number' { 'Number' }
    'Currency' { 'Currency' }
    'DateTime' { 'DateTime' }
    'Boolean' { 'Boolean' }
    'URL' { 'URL' }
    'Lookup' { 'Lookup' }
    'User' { 'User' }
    'MultiChoice' { 'MultiChoice' }
    default { 'Text' }
  }
}

function Install-HVCGListsFromSchema {
  param(
    [string]$SiteUrl,
    [string]$RepoRoot,
    $Report,
    [switch]$WhatIf
  )
  Write-HVCGLog -Level STEP -Message "Provisioning lists on $SiteUrl" -Report $Report
  Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop

  $index = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/_index.json') -Raw | ConvertFrom-Json
  $definitions = foreach ($item in $index.lists) {
    Get-Content (Join-Path $RepoRoot $item.path) -Raw | ConvertFrom-Json
  }

  foreach ($listDef in $definitions) {
    $existing = Get-PnPList -Identity $listDef.title -ErrorAction SilentlyContinue
    if (-not $existing) {
      if ($WhatIf) {
        Write-HVCGLog -Level INFO -Message "WhatIf: create list $($listDef.title)" -Report $Report
        continue
      }
      New-PnPList -Title $listDef.title -Template GenericList -OnQuickLaunch | Out-Null
      Write-HVCGLog -Level SUCCESS -Message "Created list $($listDef.title)" -Report $Report
      $Report.ResourcesCreated.Add("List:$($listDef.title)")
    }
    else {
      $Report.ResourcesSkipped.Add("List:$($listDef.title)")
    }

    foreach ($col in $listDef.columns) {
      if ($col.internalName -eq 'Title' -or $col.type -eq 'Lookup') { continue }
      if (Get-PnPField -List $listDef.title -Identity $col.internalName -ErrorAction SilentlyContinue) {
        $Report.ResourcesSkipped.Add("Field:$($listDef.title).$($col.internalName)")
        continue
      }
      if ($WhatIf) {
        Write-HVCGLog -Level INFO -Message "WhatIf: field $($listDef.title).$($col.internalName)" -Report $Report
        continue
      }
      try {
        if ($col.choices) {
          Add-PnPField -List $listDef.title -Type Choice -InternalName $col.internalName -DisplayName $col.displayName -Choices ([string[]]$col.choices) | Out-Null
        }
        else {
          $t = Get-HVCGPnPFieldType $col.type
          Add-PnPField -List $listDef.title -Type $t -InternalName $col.internalName -DisplayName $col.displayName | Out-Null
        }
        if ($col.required) {
          Set-PnPField -List $listDef.title -Identity $col.internalName -Values @{ Required = $true } -ErrorAction SilentlyContinue
        }
        if ($col.indexed) {
          Set-PnPField -List $listDef.title -Identity $col.internalName -Values @{ Indexed = $true } -ErrorAction SilentlyContinue
        }
        $Report.ResourcesCreated.Add("Field:$($listDef.title).$($col.internalName)")
      }
      catch {
        Write-HVCGLog -Level WARN -Message "Field $($listDef.title).$($col.internalName): $($_.Exception.Message)" -Report $Report
      }
    }
  }

  Write-HVCGLog -Level STEP -Message "Adding lookup columns (pass 2)" -Report $Report
  foreach ($listDef in $definitions) {
    foreach ($col in ($listDef.columns | Where-Object { $_.type -eq 'Lookup' })) {
      if (Get-PnPField -List $listDef.title -Identity $col.internalName -ErrorAction SilentlyContinue) {
        $Report.ResourcesSkipped.Add("Lookup:$($listDef.title).$($col.internalName)")
        continue
      }
      $lookupList = Get-PnPList -Identity $col.lookupList -ErrorAction SilentlyContinue
      if (-not $lookupList) {
        Write-HVCGLog -Level WARN -Message "Lookup target missing $($col.lookupList) for $($listDef.title).$($col.internalName)" -Report $Report
        continue
      }
      if ($WhatIf) { continue }
      try {
        Add-PnPField -List $listDef.title -Type Lookup -InternalName $col.internalName -DisplayName $col.displayName -Values @{
          LookupList  = $lookupList.Id.ToString()
          LookupField = 'Title'
        } | Out-Null
        if ($col.required) {
          Set-PnPField -List $listDef.title -Identity $col.internalName -Values @{ Required = $true } -ErrorAction SilentlyContinue
        }
        $Report.ResourcesCreated.Add("Lookup:$($listDef.title).$($col.internalName)")
      }
      catch {
        Write-HVCGLog -Level WARN -Message "Lookup $($listDef.title).$($col.internalName): $($_.Exception.Message)" -Report $Report
      }
    }
  }
}

function Install-HVCGViews {
  param([string]$SiteUrl, [string]$RepoRoot, $Report, [switch]$WhatIf)
  $viewsPath = Join-Path $RepoRoot 'src/sharepoint/views/command-center-views.json'
  if (-not (Test-Path $viewsPath)) { return }
  Write-HVCGLog -Level STEP -Message "Provisioning views" -Report $Report
  Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
  $views = (Get-Content $viewsPath -Raw | ConvertFrom-Json).views
  foreach ($v in $views) {
    $existing = Get-PnPView -List $v.list -Identity $v.title -ErrorAction SilentlyContinue
    if ($existing) {
      $Report.ResourcesSkipped.Add("View:$($v.list).$($v.title)")
      continue
    }
    if ($WhatIf) {
      Write-HVCGLog -Level INFO -Message "WhatIf: view $($v.list)/$($v.title)" -Report $Report
      continue
    }
    try {
      # PnP view filter uses CAML; use simple AllItems-like create then note OData filter in description
      Add-PnPView -List $v.list -Title $v.title -Fields $v.fields -ErrorAction Stop | Out-Null
      $Report.ResourcesCreated.Add("View:$($v.list).$($v.title)")
      Write-HVCGLog -Level SUCCESS -Message "Created view $($v.list)/$($v.title) (apply filter '$($v.filter)' in UI if needed)" -Report $Report
    }
    catch {
      Write-HVCGLog -Level WARN -Message "View $($v.list)/$($v.title): $($_.Exception.Message)" -Report $Report
    }
  }
}

function Install-HVCGKnowledgeTemplates {
  param([string]$KnowledgeUrl, [string]$RepoRoot, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Uploading project templates to Knowledge Center" -Report $Report
  Connect-PnPOnline -Url $KnowledgeUrl -Interactive -ErrorAction Stop

  $libName = 'ProjectTemplates'
  if (-not (Get-PnPList -Identity $libName -ErrorAction SilentlyContinue)) {
    if (-not $WhatIf) {
      New-PnPList -Title $libName -Template DocumentLibrary | Out-Null
      $Report.ResourcesCreated.Add("Library:$libName")
    }
  }
  else {
    $Report.ResourcesSkipped.Add("Library:$libName")
  }

  $templateRoot = Join-Path $RepoRoot 'templates/projects'
  Get-ChildItem $templateRoot -Filter '*.json' | ForEach-Object {
    if ($_.Name -eq '_index.json') { return }
    if ($WhatIf) {
      Write-HVCGLog -Level INFO -Message "WhatIf: upload $($_.Name)" -Report $Report
      return
    }
    Add-PnPFile -Path $_.FullName -Folder $libName -ErrorAction SilentlyContinue | Out-Null
    $Report.ResourcesUpdated.Add("TemplateUpload:$($_.Name)")
  }
}

function Install-HVCGSeedData {
  param([string]$SiteUrl, [string]$RepoRoot, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Seeding Development sample data" -Report $Report
  if ($WhatIf) { return }
  Connect-PnPOnline -Url $SiteUrl -Interactive -ErrorAction Stop
  $demo = Get-Content (Join-Path $RepoRoot 'sample-data/demo-pack.json') -Raw | ConvertFrom-Json

  foreach ($tm in $demo.teamMembers) {
    $key = "team|$($tm.Email)"
    $found = Get-PnPListItem -List 'HVCG_TeamMembers' -Query "<View><Query><Where><Eq><FieldRef Name='Email'/><Value Type='Text'>$($tm.Email)</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
    if ($found) {
      $Report.ResourcesSkipped.Add("Seed:Team:$($tm.Email)")
      continue
    }
    Add-PnPListItem -List 'HVCG_TeamMembers' -Values @{
      Title = $tm.Title; Email = $tm.Email; PrimaryRole = $tm.PrimaryRole; IsActive = $true; CapacityHoursPerWeek = [double]$tm.CapacityHoursPerWeek
    } | Out-Null
    $Report.ResourcesCreated.Add("Seed:Team:$($tm.Email)")
  }

  foreach ($c in $demo.clients) {
    $found = Get-PnPListItem -List 'HVCG_Clients' -Query "<View><Query><Where><Eq><FieldRef Name='ClientCode'/><Value Type='Text'>$($c.ClientCode)</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
    if ($found) {
      $Report.ResourcesSkipped.Add("Seed:Client:$($c.ClientCode)")
      continue
    }
    $vals = @{
      Title = $c.Title
      ClientCode = $c.ClientCode
      ClientStage = $c.ClientStage
      RelationshipOwnerEmail = $c.RelationshipOwnerEmail
      ProjectManagerEmail = $c.ProjectManagerEmail
      OverallHealth = $c.OverallHealth
      RiskLevel = $c.RiskLevel
      PaymentStatus = $c.PaymentStatus
      IsActive = [bool]$c.IsActive
      RequiresExecutiveAttention = [bool]$c.RequiresExecutiveAttention
      HVCG_IdempotencyKey = "client|$($c.ClientCode)"
    }
    if ($c.DBA) { $vals.DBA = $c.DBA }
    if ($c.Industry) { $vals.Industry = $c.Industry }
    if ($null -ne $c.MonthlyRetainer) { $vals.MonthlyRetainer = [double]$c.MonthlyRetainer }
    Add-PnPListItem -List 'HVCG_Clients' -Values $vals | Out-Null
    $Report.ResourcesCreated.Add("Seed:Client:$($c.ClientCode)")
  }

  # Catalog templates metadata
  $tindex = Get-Content (Join-Path $RepoRoot 'templates/projects/_index.json') -Raw | ConvertFrom-Json
  foreach ($t in $tindex.templates) {
    $found = Get-PnPListItem -List 'HVCG_Templates' -Query "<View><Query><Where><Eq><FieldRef Name='TemplateKey'/><Value Type='Text'>$($t.templateKey)</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
    if ($found) {
      $Report.ResourcesSkipped.Add("Seed:Template:$($t.templateKey)")
      continue
    }
    Add-PnPListItem -List 'HVCG_Templates' -Values @{
      Title = $t.title
      TemplateKey = $t.templateKey
      TemplateType = 'Project'
      ConfigJsonPath = "ProjectTemplates/$($t.templateKey).json"
      IsActive = $true
    } | Out-Null
    $Report.ResourcesCreated.Add("Seed:Template:$($t.templateKey)")
  }
}

function Install-HVCGSampleClientWorkspace {
  param([string]$ClientsUrl, [string]$ClientCode, [string]$RepoRoot, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Creating sample client workspace $ClientCode" -Report $Report
  if ($WhatIf) { return }
  $cfg = Get-Content (Join-Path $RepoRoot 'config/hvcg.config.json') -Raw | ConvertFrom-Json
  Connect-PnPOnline -Url $ClientsUrl -Interactive -ErrorAction Stop
  $libraryTitle = "HVCG_$ClientCode"
  if (-not (Get-PnPList -Identity $libraryTitle -ErrorAction SilentlyContinue)) {
    New-PnPList -Title $libraryTitle -Template DocumentLibrary | Out-Null
    $Report.ResourcesCreated.Add("ClientLibrary:$libraryTitle")
  }
  else {
    $Report.ResourcesSkipped.Add("ClientLibrary:$libraryTitle")
  }
  foreach ($folder in $cfg.documentFolderStructure) {
    Resolve-PnPFolder -SiteRelativePath "$libraryTitle/$folder" | Out-Null
  }
  $Report.ResourcesUpdated.Add("ClientFolders:${libraryTitle}:24")
}

function Save-HVCGDeploymentReport {
  param($Report, [string]$RepoRoot)
  $dir = Join-Path $RepoRoot 'deployment/reports'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $name = "HVCG-Dev-Deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
  $path = Join-Path $dir $name
  $latest = Join-Path $dir 'HVCG-Dev-Deploy-latest.json'
  $json = $Report | ConvertTo-Json -Depth 8
  Set-Content -Path $path -Value $json -Encoding UTF8
  Set-Content -Path $latest -Value $json -Encoding UTF8

  $md = @"
# HVCG Development Deployment Report

- **When:** $($Report.DeploymentDateTime)
- **Environment:** $($Report.Environment)
- **Tenant:** $($Report.Tenant)
- **Success:** $($Report.Success)

## Created
$(($Report.ResourcesCreated | ForEach-Object { "- $_" }) -join "`n")

## Updated
$(($Report.ResourcesUpdated | ForEach-Object { "- $_" }) -join "`n")

## Skipped
$(($Report.ResourcesSkipped | Select-Object -First 50 | ForEach-Object { "- $_" }) -join "`n")

## Errors
$(($Report.Errors | ForEach-Object { "- $_" }) -join "`n")

## Warnings
$(($Report.Warnings | ForEach-Object { "- $_" }) -join "`n")

## Owner actions still required
$(($Report.OwnerActionsRemaining | ForEach-Object { "- $_" }) -join "`n")

## Next step
$($Report.NextStep)
"@
  Set-Content -Path ($path -replace '\.json$', '.md') -Value $md -Encoding UTF8
  Set-Content -Path (Join-Path $dir 'HVCG-Dev-Deploy-latest.md') -Value $md -Encoding UTF8
  return $path
}

Export-ModuleMember -Function *
