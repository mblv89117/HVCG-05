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

function Test-HVCGHasProperty {
  <#
  .SYNOPSIS
    StrictMode-safe check that a NoteProperty/property exists on an object.
  #>
  param(
    $Object,
    [Parameter(Mandatory)]
    [string]$Name
  )
  if ($null -eq $Object) { return $false }
  return ($null -ne $Object.PSObject.Properties[$Name])
}

function Get-HVCGPropertyValue {
  <#
  .SYNOPSIS
    StrictMode-safe property read. Returns $Default when the property is missing or Object is null.
  #>
  param(
    $Object,
    [Parameter(Mandatory)]
    [string]$Name,
    $Default = $null
  )
  if (-not (Test-HVCGHasProperty -Object $Object -Name $Name)) { return $Default }
  return $Object.$Name
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

# Module-scoped PnP Client ID (PnP.PowerShell 2.x+/3.x requires a tenant Entra app for -Interactive).
$script:HVCGPnPClientId = $null

function Test-HVCGIsGuid {
  param([string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
  $parsed = [guid]::Empty
  return [guid]::TryParse($Value, [ref]$parsed)
}

function Resolve-HVCGPnPClientId {
  param($Config, [string]$ClientId = '')
  $candidates = @()
  if (-not [string]::IsNullOrWhiteSpace($ClientId)) { $candidates += $ClientId.Trim() }
  if ($null -ne $Config) {
    $auth = Get-HVCGPropertyValue -Object $Config -Name 'authentication' -Default $null
    $fromCfg = [string](Get-HVCGPropertyValue -Object $auth -Name 'pnpEntraAppClientId' -Default '')
    if (-not [string]::IsNullOrWhiteSpace($fromCfg)) { $candidates += $fromCfg.Trim() }
  }
  foreach ($envName in @('HVCG_PNP_CLIENT_ID', 'ENTRAID_CLIENT_ID', 'ENTRAID_APP_ID')) {
    $v = [Environment]::GetEnvironmentVariable($envName)
    if (-not [string]::IsNullOrWhiteSpace($v)) { $candidates += $v.Trim() }
  }
  if (-not [string]::IsNullOrWhiteSpace($script:HVCGPnPClientId)) { $candidates += $script:HVCGPnPClientId.Trim() }

  foreach ($c in $candidates) {
    if ((Test-HVCGPlaceholder $c)) { continue }
    if (-not (Test-HVCGIsGuid $c)) { continue }
    return $c
  }
  return $null
}

function Set-HVCGPnPClientIdInConfig {
  param(
    [Parameter(Mandatory)][string]$ConfigPath,
    [Parameter(Mandatory)][string]$ClientId,
    [string]$DisplayName = 'HVCG-PnP-PowerShell',
    $Report
  )
  if (-not (Test-HVCGIsGuid $ClientId)) { throw "ClientId is not a GUID: $ClientId" }
  if (-not (Test-Path $ConfigPath)) { throw "Config not found: $ConfigPath" }
  $cfg = Get-Content $ConfigPath -Raw | ConvertFrom-Json
  if (-not (Test-HVCGHasProperty -Object $cfg -Name 'authentication') -or $null -eq $cfg.authentication) {
    $cfg | Add-Member -NotePropertyName authentication -NotePropertyValue ([pscustomobject]@{}) -Force
  }
  $auth = $cfg.authentication
  if (-not (Test-HVCGHasProperty -Object $auth -Name 'pnpEntraAppClientId')) {
    $auth | Add-Member -NotePropertyName pnpEntraAppClientId -NotePropertyValue $ClientId -Force
  }
  else {
    $auth.pnpEntraAppClientId = $ClientId
  }
  if (-not (Test-HVCGHasProperty -Object $auth -Name 'pnpEntraAppDisplayName')) {
    $auth | Add-Member -NotePropertyName pnpEntraAppDisplayName -NotePropertyValue $DisplayName -Force
  }
  else {
    $auth.pnpEntraAppDisplayName = $DisplayName
  }
  ($cfg | ConvertTo-Json -Depth 12) | Set-Content -Path $ConfigPath -Encoding UTF8
  $script:HVCGPnPClientId = $ClientId
  Write-HVCGLog -Level SUCCESS -Message "Saved pnpEntraAppClientId to $ConfigPath" -Report $Report
}

function Initialize-HVCGPnPAuth {
  <#
  .SYNOPSIS
    Resolves and caches the Entra app Client ID required by modern PnP.PowerShell interactive auth.
  #>
  param($Config, $Report)
  $id = Resolve-HVCGPnPClientId -Config $Config
  if (-not $id) {
    $msg = @"
PnP.PowerShell interactive auth requires a dedicated provisioning Entra app Client ID (not id-atlas-prod).

Review, then register (interactive + MFA, no secret):

  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1
  pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Apply -UpdateConfig

Or set authentication.pnpEntraAppClientId in config/environments/development.json
(or export HVCG_PNP_CLIENT_ID / ENTRAID_CLIENT_ID). Do not use AZURE_CLIENT_ID (Hub MI).

See: docs/deployment/PNP_AUTHENTICATION.md
https://pnp.github.io/powershell/articles/registerapplication.html
"@
    Write-HVCGLog -Level ERROR -Message ($msg -replace "`n", ' ') -Report $Report
    throw $msg.Trim()
  }
  $script:HVCGPnPClientId = $id
  Write-HVCGLog -Level SUCCESS -Message "PnP auth ClientId resolved ($($id.Substring(0, [Math]::Min(8, $id.Length)))…)." -Report $Report

  # Optional: persist default for this SharePoint host so future ad-hoc Connect-PnPOnline works
  try {
    if ($null -ne $Config -and (Get-Command Set-PnPManagedAppId -ErrorAction SilentlyContinue)) {
      $root = [string](Get-HVCGPropertyValue -Object $Config.tenant -Name 'sharePointRoot' -Default '')
      if ($root) {
        Set-PnPManagedAppId -Url $root -AppId $id -ErrorAction SilentlyContinue
      }
    }
  }
  catch { }

  return $id
}

function Test-HVCGPnPConnectedTo {
  <#
  .SYNOPSIS
    True when an active PnP connection already targets $Url (ignore trailing slash).
  #>
  param([Parameter(Mandatory)][string]$Url)
  try {
    $conn = Get-PnPConnection -ErrorAction SilentlyContinue
    if (-not $conn) { return $false }
    $current = [string](Get-HVCGPropertyValue -Object $conn -Name 'Url' -Default '')
    if ([string]::IsNullOrWhiteSpace($current)) { return $false }
    return ($current.TrimEnd('/') -eq $Url.TrimEnd('/'))
  }
  catch {
    return $false
  }
}

function Connect-HVCGPnPOnline {
  <#
  .SYNOPSIS
    Connect-PnPOnline -Interactive -ClientId (supported PnP.PowerShell 3.x flow).
    Reuses an existing connection to the same URL so DeviceLogin sessions are not
    replaced by a second Interactive MFA prompt mid-deploy.
  #>
  param(
    [Parameter(Mandatory)]
    [string]$Url,
    $Config,
    [string]$ClientId = '',
    $Report,
    [switch]$Force
  )
  $cid = Resolve-HVCGPnPClientId -Config $Config -ClientId $ClientId
  if (-not $cid) {
    throw @"
Connect-HVCGPnPOnline: no Entra Client ID. Call Initialize-HVCGPnPAuth first, or set authentication.pnpEntraAppClientId / HVCG_PNP_CLIENT_ID.
Register: pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1
Then:     pwsh -File ./deployment/scripts/Register-HVCGPnPEntraApp.ps1 -Apply -UpdateConfig
"@
  }
  $script:HVCGPnPClientId = $cid
  if (-not $Force -and (Test-HVCGPnPConnectedTo -Url $Url)) {
    Write-HVCGLog -Level INFO -Message "Reusing existing PnP connection → $Url" -Report $Report
    return
  }
  Write-HVCGLog -Level INFO -Message "Connect-PnPOnline Interactive+ClientId → $Url" -Report $Report
  Connect-PnPOnline -Url $Url -Interactive -ClientId $cid -ErrorAction Stop | Out-Null
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
    $Config,
    [switch]$WhatIf,
    [switch]$SecurityCritical
  )
  if (-not $SiteCfg) { return $null }
  if (-not (Test-HVCGHasProperty -Object $SiteCfg -Name 'alias') -or [string]::IsNullOrWhiteSpace([string]$SiteCfg.alias)) {
    return $null
  }
  # Only secureDataRooms (and similar) define "enabled". Other sites omit it — under StrictMode,
  # reading a missing .enabled throws. Treat missing as enabled (default create).
  if ((Get-HVCGPropertyValue -Object $SiteCfg -Name 'enabled' -Default $true) -eq $false) {
    Write-HVCGLog -Level INFO -Message "Site disabled in config: $($SiteCfg.alias)" -Report $Report
    $Report.ResourcesSkipped.Add("Site:$($SiteCfg.alias):disabled")
    return $null
  }

  Write-HVCGLog -Level STEP -Message "Ensuring site $($SiteCfg.title) ($($SiteCfg.url))" -Report $Report
  try {
    Connect-HVCGPnPOnline -Url $AdminUrl -Config $Config -Report $Report
  }
  catch {
    # Fallback: connect to root
    Write-HVCGLog -Level WARN -Message "Admin center connect failed; trying SharePoint root interactive. $($_.Exception.Message)" -Report $Report
    $root = ($SiteCfg.url -replace '/sites/.*','')
    Connect-HVCGPnPOnline -Url $root -Config $Config -Report $Report
  }

  $exists = $false
  try {
    Connect-HVCGPnPOnline -Url $SiteCfg.url -Config $Config -Report $Report
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
      Connect-HVCGPnPOnline -Url $AdminUrl -Config $Config -Report $Report
      Invoke-HVCGPnPWithRetry -OperationName "New-PnPTenantSite:$($SiteCfg.alias)" -Report $Report -ScriptBlock {
        New-PnPTenantSite -Title $SiteCfg.title -Url $SiteCfg.url -Owner $OwnerUpn -TimeZone 13 -Wait -ErrorAction Stop | Out-Null
      }
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
    Connect-HVCGPnPOnline -Url $SiteCfg.url -Config $Config -Report $Report
    Invoke-HVCGPnPWithRetry -OperationName "Set-PnPSite:Sharing:$($SiteCfg.alias)" -Report $Report -ScriptBlock {
      Set-PnPSite -Identity $SiteCfg.url -SharingCapability Disabled -ErrorAction Stop | Out-Null
    }
    Write-HVCGLog -Level SUCCESS -Message "Sharing disabled on Dev site $($SiteCfg.alias)" -Report $Report
    $Report.ResourcesUpdated.Add("SiteSharing:$($SiteCfg.alias):Disabled")
  }
  catch {
    Write-HVCGLog -Level WARN -Message "Could not set SharingCapability on $($SiteCfg.alias): $($_.Exception.Message)" -Report $Report
  }

  return $SiteCfg.url
}

# --- Resilient SharePoint / PnP execution ------------------------------------

function Test-HVCGIsRetriableSharePointError {
  param(
    $ErrorRecord = $null,
    [string]$Message = ''
  )
  $parts = [System.Collections.Generic.List[string]]::new()
  if ($Message) { $parts.Add($Message) }
  if ($null -ne $ErrorRecord) {
    if ($ErrorRecord.Exception) { $parts.Add([string]$ErrorRecord.Exception.Message) }
    if ($ErrorRecord.Exception -and $ErrorRecord.Exception.InnerException) {
      $parts.Add([string]$ErrorRecord.Exception.InnerException.Message)
    }
    $parts.Add([string]$ErrorRecord)
  }
  $text = ($parts -join ' ')
  if ([string]::IsNullOrWhiteSpace($text)) { return $false }
  return [bool]($text -match '(?i)(\b429\b|Too Many Requests|throttl|Retry-After|\b503\b|Service Unavailable|temporarily unavailable|timed out|timeout|Server busy|Request failed|connection.*(reset|closed|abort)|NameResolutionFailure|WebException|HttpRequestException|IOException|The remote name could not be resolved|An existing connection was forcibly closed)')
}

function Get-HVCGRetryAfterSeconds {
  param($ErrorRecord = $null, [string]$Message = '')
  $text = $Message
  if ($null -ne $ErrorRecord) {
    $text = "$text $($ErrorRecord.Exception.Message)"
    try {
      $resp = $ErrorRecord.Exception.Response
      if ($resp -and $resp.Headers) {
        $h = $resp.Headers['Retry-After']
        if ($h) {
          $n = 0
          if ([int]::TryParse([string]$h, [ref]$n) -and $n -gt 0) { return $n }
        }
      }
    }
    catch { }
  }
  if ($text -match '(?i)Retry-After[=:\s]+(\d+)') {
    return [int]$Matches[1]
  }
  return $null
}

function Get-HVCGRetryDelaySeconds {
  <#
  .SYNOPSIS
    Exponential backoff schedule 2,4,8,16,30 (cap) with light jitter. Honors Retry-After when present.
  #>
  param(
    [Parameter(Mandatory)][int]$AttemptIndex, # 0-based failure count for delay selection
    [Nullable[int]]$RetryAfterSeconds = $null,
    [switch]$NoJitter
  )
  $schedule = @(2, 4, 8, 16, 30)
  $idx = [Math]::Min([Math]::Max(0, $AttemptIndex), $schedule.Count - 1)
  $base = $schedule[$idx]
  if ($null -ne $RetryAfterSeconds -and $RetryAfterSeconds -gt 0) {
    $base = [Math]::Max($base, [int]$RetryAfterSeconds)
  }
  $base = [Math]::Min(30, $base)
  if ($NoJitter) { return $base }
  $jitterMax = [Math]::Max(1, [int][Math]::Ceiling($base * 0.25))
  $jitter = Get-Random -Minimum 0 -Maximum ($jitterMax + 1)
  return [Math]::Min(30, $base + $jitter)
}

function Invoke-HVCGPnPWithRetry {
  <#
  .SYNOPSIS
    Execute a SharePoint/PnP mutating (or sensitive) operation with retry on 429/503/throttle/transient errors.
  #>
  param(
    [Parameter(Mandatory)][scriptblock]$ScriptBlock,
    [string]$OperationName = 'PnP',
    $Report,
    [int]$MaxAttempts = 6,
    [switch]$DisableSleep
  )
  $attempt = 0
  $lastError = $null
  while ($attempt -lt $MaxAttempts) {
    $attempt++
    try {
      return & $ScriptBlock
    }
    catch {
      $lastError = $_
      $retriable = Test-HVCGIsRetriableSharePointError -ErrorRecord $_
      if (-not $retriable -or $attempt -ge $MaxAttempts) {
        throw
      }
      $retryAfter = Get-HVCGRetryAfterSeconds -ErrorRecord $_
      $delay = Get-HVCGRetryDelaySeconds -AttemptIndex ($attempt - 1) -RetryAfterSeconds $retryAfter -NoJitter:$DisableSleep
      Write-HVCGLog -Level WARN -Message "$OperationName attempt $attempt/$MaxAttempts failed (retriable). Sleep ${delay}s. $($_.Exception.Message)" -Report $Report
      if (-not $DisableSleep) {
        Start-Sleep -Seconds $delay
      }
    }
  }
  throw $lastError
}

function Wait-HVCGPnPFieldVisible {
  <#
  .SYNOPSIS
    Poll until Get-PnPField returns the field (propagation). Default: every 2s, timeout 60s.
  #>
  param(
    [Parameter(Mandatory)][string]$ListTitle,
    [Parameter(Mandatory)][string]$InternalName,
    $Report,
    [int]$TimeoutSeconds = 60,
    [int]$PollSeconds = 2,
    [scriptblock]$FieldGetter = $null,
    [switch]$DisableSleep
  )
  $getter = $FieldGetter
  if (-not $getter) {
    $getter = {
      param($List, $Name)
      Invoke-HVCGPnPWithRetry -OperationName "Get-PnPField:$List.$Name" -Report $Report -ScriptBlock {
        Get-PnPField -List $List -Identity $Name -ErrorAction SilentlyContinue
      }
    }
  }
  $maxPolls = [Math]::Max(1, [int][Math]::Ceiling($TimeoutSeconds / [Math]::Max(1, $PollSeconds)))
  for ($i = 0; $i -lt $maxPolls; $i++) {
    $field = & $getter $ListTitle $InternalName
    if ($null -ne $field) { return $field }
    if ($i -ge ($maxPolls - 1)) { break }
    Write-HVCGLog -Level INFO -Message "Waiting for field visibility $ListTitle.$InternalName (poll $($i + 1)/$maxPolls)..." -Report $Report
    if (-not $DisableSleep) { Start-Sleep -Seconds $PollSeconds }
  }
  throw "Field not visible after ${TimeoutSeconds}s: $ListTitle.$InternalName"
}

function Wait-HVCGPnPListVisible {
  param(
    [Parameter(Mandatory)][string]$ListTitle,
    $Report,
    [int]$TimeoutSeconds = 60,
    [int]$PollSeconds = 2,
    [scriptblock]$ListGetter = $null,
    [switch]$DisableSleep
  )
  $getter = $ListGetter
  if (-not $getter) {
    $getter = {
      param($Title)
      Invoke-HVCGPnPWithRetry -OperationName "Get-PnPList:$Title" -Report $Report -ScriptBlock {
        Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
      }
    }
  }
  $maxPolls = [Math]::Max(1, [int][Math]::Ceiling($TimeoutSeconds / [Math]::Max(1, $PollSeconds)))
  for ($i = 0; $i -lt $maxPolls; $i++) {
    $list = & $getter $ListTitle
    if ($null -ne $list) { return $list }
    if ($i -ge ($maxPolls - 1)) { break }
    Write-HVCGLog -Level INFO -Message "Waiting for list visibility $ListTitle (poll $($i + 1)/$maxPolls)..." -Report $Report
    if (-not $DisableSleep) { Start-Sleep -Seconds $PollSeconds }
  }
  throw "List not visible after ${TimeoutSeconds}s: $ListTitle"
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

function Test-HVCGPnPFieldTypeMatch {
  param([string]$SchemaType, [string]$PnPTypeAsString)
  $expected = Get-HVCGPnPFieldType $SchemaType
  $actual = [string]$PnPTypeAsString
  # PnP may report variants (e.g. Currency vs Number, Note vs Text)
  if ($actual -eq $expected) { return $true }
  if ($expected -eq 'Currency' -and $actual -in @('Currency', 'Number')) { return $true }
  if ($expected -eq 'Note' -and $actual -in @('Note', 'Text')) { return $true }
  if ($expected -eq 'MultiChoice' -and $actual -match 'Choice') { return $true }
  if ($expected -eq 'URL' -and $actual -in @('URL', 'Text')) { return $true }
  return $false
}

function Get-HVCGColumnSchemaFacade {
  <#
  .SYNOPSIS
    StrictMode-safe read of optional list column schema properties.
  #>
  param(
    [Parameter(Mandatory)]$Column
  )
  $type = [string](Get-HVCGPropertyValue -Object $Column -Name 'type' -Default 'Text')
  $choices = $null
  if ($type -in @('Choice', 'MultiChoice')) {
    $raw = Get-HVCGPropertyValue -Object $Column -Name 'choices' -Default @()
    if ($null -eq $raw) { $choices = @() }
    elseif ($raw -is [System.Array]) { $choices = @($raw) }
    else { $choices = @([string]$raw) }
  }
  $defaultVal = Get-HVCGPropertyValue -Object $Column -Name 'default' -Default $null
  if ($null -eq $defaultVal) {
    $defaultVal = Get-HVCGPropertyValue -Object $Column -Name 'defaultValue' -Default $null
  }
  return [pscustomobject]@{
    InternalName = [string](Get-HVCGPropertyValue -Object $Column -Name 'internalName' -Default '')
    DisplayName  = [string](Get-HVCGPropertyValue -Object $Column -Name 'displayName' -Default (Get-HVCGPropertyValue -Object $Column -Name 'internalName' -Default ''))
    Type         = $type
    Required     = [bool](Get-HVCGPropertyValue -Object $Column -Name 'required' -Default $false)
    Indexed      = [bool](Get-HVCGPropertyValue -Object $Column -Name 'indexed' -Default $false)
    Unique       = [bool](Get-HVCGPropertyValue -Object $Column -Name 'unique' -Default $false)
    Description  = [string](Get-HVCGPropertyValue -Object $Column -Name 'description' -Default '')
    Choices      = $choices
    LookupList   = Get-HVCGPropertyValue -Object $Column -Name 'lookupList' -Default $null
    LookupField  = [string](Get-HVCGPropertyValue -Object $Column -Name 'lookupField' -Default 'Title')
    Default      = $defaultVal
    MultiValue   = [bool](Get-HVCGPropertyValue -Object $Column -Name 'multiValue' -Default $false)
    Format       = Get-HVCGPropertyValue -Object $Column -Name 'format' -Default $null
    Minimum      = Get-HVCGPropertyValue -Object $Column -Name 'minimum' -Default $null
    Maximum      = Get-HVCGPropertyValue -Object $Column -Name 'maximum' -Default $null
  }
}

function Add-HVCGFieldFromSchema {
  <#
  .SYNOPSIS
    Create one SharePoint field from HVCG schema; StrictMode-safe; verifies existence with retry + propagation wait.
  #>
  param(
    [Parameter(Mandatory)][string]$ListTitle,
    [Parameter(Mandatory)]$Column,
    $Report,
    [switch]$WhatIf
  )
  $c = Get-HVCGColumnSchemaFacade -Column $Column
  if ([string]::IsNullOrWhiteSpace($c.InternalName)) {
    throw "Column missing internalName on list $ListTitle"
  }
  if ($c.InternalName -eq 'Title') {
    return [pscustomobject]@{ Status = 'Skipped'; Reason = 'Title' }
  }

  $existing = Invoke-HVCGPnPWithRetry -OperationName "Get-PnPField:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
    Get-PnPField -List $ListTitle -Identity $c.InternalName -ErrorAction SilentlyContinue
  }
  if ($existing) {
    $typeOk = Test-HVCGPnPFieldTypeMatch -SchemaType $c.Type -PnPTypeAsString $existing.TypeAsString
    if (-not $typeOk) {
      $msg = "Field type mismatch $ListTitle.$($c.InternalName): schema=$($c.Type) sharepoint=$($existing.TypeAsString)"
      Write-HVCGLog -Level ERROR -Message $msg -Report $Report
      return [pscustomobject]@{ Status = 'Incorrect'; Reason = $msg }
    }
    $Report.ResourcesSkipped.Add("Field:${ListTitle}.$($c.InternalName)")
    return [pscustomobject]@{ Status = 'Skipped'; Reason = 'Exists' }
  }

  if ($WhatIf) {
    Write-HVCGLog -Level INFO -Message "WhatIf: field $ListTitle.$($c.InternalName) ($($c.Type))" -Report $Report
    return [pscustomobject]@{ Status = 'WhatIf' }
  }

  try {
    if ($c.Type -eq 'Lookup') {
      $lookupListName = [string]$c.LookupList
      if ([string]::IsNullOrWhiteSpace($lookupListName)) {
        throw "Lookup field $($c.InternalName) missing lookupList"
      }
      # Target list must exist before the lookup column can be created.
      $lookupList = Wait-HVCGPnPListVisible -ListTitle $lookupListName -Report $Report
      if ($null -eq $lookupList -or $null -eq $lookupList.Id) {
        throw "Lookup target list '$lookupListName' has no Id for field $($c.InternalName)"
      }
      $showField = if ([string]::IsNullOrWhiteSpace([string]$c.LookupField)) { 'Title' } else { [string]$c.LookupField }
      $fieldId = [guid]::NewGuid().ToString()
      $listId = $lookupList.Id.ToString()
      $dn = [System.Security.SecurityElement]::Escape([string]$c.DisplayName)
      $name = [System.Security.SecurityElement]::Escape([string]$c.InternalName)
      $sf = [System.Security.SecurityElement]::Escape($showField)
      $reqAttr = if ($c.Required) { 'TRUE' } else { 'FALSE' }
      # PnP.PowerShell 3.x Add-PnPField has no -Values / -LookupList. Create lookups via CAML FieldXml.
      $fieldXml = "<Field Type=`"Lookup`" DisplayName=`"$dn`" StaticName=`"$name`" Name=`"$name`" List=`"{$listId}`" ShowField=`"$sf`" Required=`"$reqAttr`" ID=`"{$fieldId}`" />"
      Invoke-HVCGPnPWithRetry -OperationName "Add-PnPFieldFromXml:Lookup:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Add-PnPFieldFromXml -List $ListTitle -FieldXml $fieldXml -ErrorAction Stop | Out-Null
      }
    }
    elseif ($c.Type -eq 'Choice') {
      if (-not $c.Choices -or @($c.Choices).Count -eq 0) {
        throw "Choice field $($c.InternalName) has no choices"
      }
      Invoke-HVCGPnPWithRetry -OperationName "Add-PnPField:Choice:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Add-PnPField -List $ListTitle -Type Choice -InternalName $c.InternalName -DisplayName $c.DisplayName -Choices ([string[]]$c.Choices) -ErrorAction Stop | Out-Null
      }
    }
    elseif ($c.Type -eq 'MultiChoice') {
      if (-not $c.Choices -or @($c.Choices).Count -eq 0) {
        throw "MultiChoice field $($c.InternalName) has no choices"
      }
      Invoke-HVCGPnPWithRetry -OperationName "Add-PnPField:MultiChoice:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Add-PnPField -List $ListTitle -Type MultiChoice -InternalName $c.InternalName -DisplayName $c.DisplayName -Choices ([string[]]$c.Choices) -ErrorAction Stop | Out-Null
      }
    }
    else {
      $t = Get-HVCGPnPFieldType $c.Type
      Invoke-HVCGPnPWithRetry -OperationName "Add-PnPField:${t}:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Add-PnPField -List $ListTitle -Type $t -InternalName $c.InternalName -DisplayName $c.DisplayName -ErrorAction Stop | Out-Null
      }
    }

    $verify = Wait-HVCGPnPFieldVisible -ListTitle $ListTitle -InternalName $c.InternalName -Report $Report

    if ($c.Required) {
      Invoke-HVCGPnPWithRetry -OperationName "Set-PnPField:Required:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Set-PnPField -List $ListTitle -Identity $c.InternalName -Values @{ Required = $true } -ErrorAction Stop | Out-Null
      }
    }
    if ($c.Indexed) {
      Invoke-HVCGPnPWithRetry -OperationName "Set-PnPField:Indexed:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Set-PnPField -List $ListTitle -Identity $c.InternalName -Values @{ Indexed = $true } -ErrorAction Stop | Out-Null
      }
    }
    if ($null -ne $c.Default -and $c.Type -eq 'Boolean') {
      Invoke-HVCGPnPWithRetry -OperationName "Set-PnPField:Default:$ListTitle.$($c.InternalName)" -Report $Report -ScriptBlock {
        Set-PnPField -List $ListTitle -Identity $c.InternalName -Values @{ DefaultValue = ([bool]$c.Default).ToString() } -ErrorAction Stop | Out-Null
      }
    }

    if (-not (Test-HVCGPnPFieldTypeMatch -SchemaType $c.Type -PnPTypeAsString $verify.TypeAsString)) {
      throw "Field verify type mismatch $ListTitle.$($c.InternalName): schema=$($c.Type) sharepoint=$($verify.TypeAsString)"
    }

    $Report.ResourcesCreated.Add("Field:${ListTitle}.$($c.InternalName)")
    Write-HVCGLog -Level SUCCESS -Message "Field $ListTitle.$($c.InternalName) ($($c.Type))" -Report $Report
    return [pscustomobject]@{ Status = 'Created' }
  }
  catch {
    $msg = "Field $ListTitle.$($c.InternalName): $($_.Exception.Message)"
    Write-HVCGLog -Level ERROR -Message $msg -Report $Report
    throw $msg
  }
}

function Get-HVCGListDefinitions {
  param([string]$RepoRoot)
  $index = Get-Content (Join-Path $RepoRoot 'src/sharepoint/lists/_index.json') -Raw | ConvertFrom-Json
  foreach ($item in $index.lists) {
    Get-Content (Join-Path $RepoRoot $item.path) -Raw | ConvertFrom-Json
  }
}

function Test-HVCGIsSystemSharePointField {
  param([Parameter(Mandatory)][string]$InternalName)
  $system = @(
    'ID', 'Title', 'ContentType', 'ContentTypeId', 'Modified', 'Created', 'Author', 'Editor',
    '_UIVersionString', 'Attachments', 'Edit', 'LinkTitleNoMenu', 'LinkTitle', 'DocIcon',
    'ItemChildCount', 'FolderChildCount', 'AppAuthor', 'AppEditor', 'ComplianceAssetId',
    '_HasCopyDestinations', '_CopySource', 'owshiddenversion', 'WorkflowVersion', '_ModerationStatus',
    '_ModerationComments', 'FileRef', 'FileDirRef', 'Last_x0020_Modified', 'Created_x0020_Date',
    'FileLeafRef', 'UniqueId', 'SyncClientId', 'ProgId', 'ScopeId', 'File_x0020_Type', 'MetaInfo',
    '_Level', 'IsCurrentVersion', 'Restricted', 'OriginatorId', 'NoExecute', 'ContentVersion',
    'Order', 'GUID', 'WorkflowInstanceID', 'FileSizeDisplay', 'ParentUniqueId', 'ParentVersionString',
    'ParentLeafName', 'DocConcurrencyNumber', 'StreamHash', 'SortBehavior', 'PermMask', 'PrincipalCount',
    'HTML_x0020_File_x0020_Type', 'SelectTitle', 'SelectFilename', 'File_x0020_Size', 'EncodedAbsUrl',
    'BaseName', 'URL', '_EditMenuTableStart', '_EditMenuTableEnd', 'LinkFilenameNoMenu', 'LinkFilename'
  )
  return ($InternalName -in $system)
}

function Test-HVCGSharePointSchemaCompliance {
  <#
  .SYNOPSIS
    Compare every configured list/column vs live SharePoint. Reports missing, extra, and mismatched fields.
  #>
  param(
    [string]$SiteUrl,
    [string]$RepoRoot,
    $Report,
    [switch]$Connect,
    [scriptblock]$ListGetter = $null,
    [scriptblock]$FieldLister = $null,
    [scriptblock]$FieldGetter = $null
  )
  if ($Connect) { Connect-HVCGPnPOnline -Url $SiteUrl -Report $Report }

  $missing = [System.Collections.Generic.List[string]]::new()
  $extra = [System.Collections.Generic.List[string]]::new()
  $incorrect = [System.Collections.Generic.List[string]]::new()
  $checked = [System.Collections.Generic.List[object]]::new()
  $ok = 0
  $listsChecked = 0

  $getList = $ListGetter
  if (-not $getList) {
    $getList = {
      param($Title)
      Get-PnPList -Identity $Title -ErrorAction SilentlyContinue
    }
  }
  $listFields = $FieldLister
  if (-not $listFields) {
    $listFields = {
      param($Title)
      @(Get-PnPField -List $Title -ErrorAction SilentlyContinue)
    }
  }
  $getField = $FieldGetter
  if (-not $getField) {
    $getField = {
      param($Title, $Name)
      Get-PnPField -List $Title -Identity $Name -ErrorAction SilentlyContinue
    }
  }

  foreach ($listDef in (Get-HVCGListDefinitions -RepoRoot $RepoRoot)) {
    $listsChecked++
    $list = & $getList $listDef.title
    if (-not $list) {
      $missing.Add("List:$($listDef.title)")
      continue
    }

    $expected = [System.Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($col in $listDef.columns) {
      $c = Get-HVCGColumnSchemaFacade -Column $col
      if ([string]::IsNullOrWhiteSpace($c.InternalName)) { continue }
      [void]$expected.Add($c.InternalName)

      if ($c.InternalName -eq 'Title') {
        $ok++
        $checked.Add([pscustomobject]@{ List = $listDef.title; Field = 'Title'; Status = 'Ok'; SchemaType = 'Text'; SharePointType = 'Text' })
        continue
      }

      $field = & $getField $listDef.title $c.InternalName
      if (-not $field) {
        $missing.Add("$($listDef.title).$($c.InternalName)")
        $checked.Add([pscustomobject]@{ List = $listDef.title; Field = $c.InternalName; Status = 'Missing'; SchemaType = $c.Type; SharePointType = $null })
        continue
      }

      $spType = [string]$field.TypeAsString
      if (-not (Test-HVCGPnPFieldTypeMatch -SchemaType $c.Type -PnPTypeAsString $spType)) {
        $incorrect.Add("$($listDef.title).$($c.InternalName):schema=$($c.Type):sp=$spType")
        $checked.Add([pscustomobject]@{ List = $listDef.title; Field = $c.InternalName; Status = 'Mismatch'; SchemaType = $c.Type; SharePointType = $spType })
        continue
      }

      $spRequired = $false
      try { $spRequired = [bool]$field.Required } catch { $spRequired = $false }
      if ([bool]$c.Required -ne $spRequired) {
        $incorrect.Add("$($listDef.title).$($c.InternalName):required schema=$([bool]$c.Required) sp=$spRequired")
        $checked.Add([pscustomobject]@{ List = $listDef.title; Field = $c.InternalName; Status = 'Mismatch'; SchemaType = $c.Type; SharePointType = $spType; Detail = "required schema=$([bool]$c.Required) sp=$spRequired" })
        continue
      }

      $ok++
      $checked.Add([pscustomobject]@{ List = $listDef.title; Field = $c.InternalName; Status = 'Ok'; SchemaType = $c.Type; SharePointType = $spType })
    }

    foreach ($live in @(& $listFields $listDef.title)) {
      $name = [string]$live.InternalName
      if ([string]::IsNullOrWhiteSpace($name)) { continue }
      if (Test-HVCGIsSystemSharePointField -InternalName $name) { continue }
      $hidden = $false
      try { $hidden = [bool]$live.Hidden } catch { $hidden = $false }
      if ($hidden) { continue }
      $fromBase = $false
      try { $fromBase = [bool]$live.FromBaseType } catch { $fromBase = $false }
      if ($fromBase) { continue }
      if ($expected.Contains($name)) { continue }
      $extra.Add("$($listDef.title).$name")
      $checked.Add([pscustomobject]@{
          List           = $listDef.title
          Field          = $name
          Status         = 'Extra'
          SchemaType     = $null
          SharePointType = [string]$live.TypeAsString
        })
    }
  }

  $hasDrift = ($missing.Count -gt 0 -or $extra.Count -gt 0 -or $incorrect.Count -gt 0)
  return [pscustomobject]@{
    GeneratedAtUtc = (Get-Date).ToUniversalTime().ToString('o')
    SiteUrl        = $SiteUrl
    ListsChecked   = $listsChecked
    OkCount        = $ok
    Missing        = @($missing)
    Extra          = @($extra)
    Incorrect      = @($incorrect)
    Mismatched     = @($incorrect)
    Fields         = @($checked)
    HasDrift       = $hasDrift
    IsCompliant    = (-not $hasDrift)
  }
}

function Save-HVCGSchemaValidationReport {
  param(
    [Parameter(Mandatory)]$Result,
    [Parameter(Mandatory)][string]$RepoRoot,
    [string]$Phase = 'schema',
    $Report
  )
  $dir = Join-Path $RepoRoot 'deployment/reports/schema'
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $jsonName = "schema-validation-$stamp.json"
  $jsonPath = Join-Path $dir $jsonName
  $latestJson = Join-Path $dir 'schema-validation-latest.json'
  $latestMd = Join-Path $dir 'schema-validation-latest.md'

  $payload = [pscustomobject]@{
    phase          = $Phase
    generatedAtUtc = $Result.GeneratedAtUtc
    siteUrl        = $Result.SiteUrl
    listsChecked   = $Result.ListsChecked
    okCount        = $Result.OkCount
    missingCount   = @($Result.Missing).Count
    extraCount     = @($Result.Extra).Count
    mismatchedCount = @($Result.Incorrect).Count
    hasDrift       = [bool]$Result.HasDrift
    isCompliant    = [bool]$Result.IsCompliant
    missing        = @($Result.Missing)
    extra          = @($Result.Extra)
    mismatched     = @($Result.Incorrect)
    fields         = @($Result.Fields)
  }

  $json = $payload | ConvertTo-Json -Depth 8
  Set-Content -Path $jsonPath -Value $json -Encoding UTF8
  Set-Content -Path $latestJson -Value $json -Encoding UTF8

  $fmtList = {
    param([object[]]$Items)
    if (-not $Items -or $Items.Count -eq 0) { return "- (none)" }
    return (($Items | ForEach-Object { "- $_" }) -join "`n")
  }

  $md = @"
# HVCG Schema Validation Report

- **Phase:** $Phase
- **Generated (UTC):** $($Result.GeneratedAtUtc)
- **Site:** $($Result.SiteUrl)
- **Lists checked:** $($Result.ListsChecked)
- **Fields OK:** $($Result.OkCount)
- **Missing:** $(@($Result.Missing).Count)
- **Extra:** $(@($Result.Extra).Count)
- **Mismatched:** $(@($Result.Incorrect).Count)
- **Compliant:** $($Result.IsCompliant)
- **Has drift:** $($Result.HasDrift)

## Missing
$(& $fmtList @($Result.Missing))

## Extra
$(& $fmtList @($Result.Extra))

## Mismatched
$(& $fmtList @($Result.Incorrect))
"@
  Set-Content -Path $latestMd -Value $md -Encoding UTF8

  if ($null -ne $Report) {
    if (-not (Test-HVCGHasProperty -Object $Report -Name 'SchemaValidationPath')) {
      $Report | Add-Member -NotePropertyName SchemaValidationPath -NotePropertyValue $latestJson -Force
    }
    else {
      $Report.SchemaValidationPath = $latestJson
    }
  }

  Write-HVCGLog -Level INFO -Message "Schema validation report: $latestJson" -Report $Report
  return $latestJson
}

function Assert-HVCGSharePointSchemaCompliance {
  param(
    [string]$SiteUrl,
    [string]$RepoRoot,
    $Report,
    [string]$Phase = 'schema'
  )
  Write-HVCGLog -Level STEP -Message "Validating SharePoint schema vs repo ($Phase)..." -Report $Report
  $result = Test-HVCGSharePointSchemaCompliance -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report -Connect
  $path = Save-HVCGSchemaValidationReport -Result $result -RepoRoot $RepoRoot -Phase $Phase -Report $Report
  if (-not $result.IsCompliant -or $result.HasDrift) {
    foreach ($m in @($result.Missing)) { Write-HVCGLog -Level ERROR -Message "Missing schema element: $m" -Report $Report }
    foreach ($e in @($result.Extra)) { Write-HVCGLog -Level ERROR -Message "Extra field (drift): $e" -Report $Report }
    foreach ($i in @($result.Incorrect)) { Write-HVCGLog -Level ERROR -Message "Mismatched field: $i" -Report $Report }
    throw "SharePoint schema drift ($Phase). Missing=$(@($result.Missing).Count) Extra=$(@($result.Extra).Count) Mismatched=$(@($result.Incorrect).Count). Report: $path. Re-run Repair-HVCGOSSharePointSchema.ps1 / Deploy (idempotent)."
  }
  Write-HVCGLog -Level SUCCESS -Message "Schema compliance OK ($($result.OkCount) fields; no missing/extra/mismatch). Report: $path" -Report $Report
  return $result
}

function Install-HVCGListsFromSchema {
  param(
    [string]$SiteUrl,
    [string]$RepoRoot,
    $Report,
    [switch]$WhatIf,
    [switch]$SkipLookups
  )
  Write-HVCGLog -Level STEP -Message "Provisioning lists/fields on $SiteUrl (StrictMode-safe)" -Report $Report
  Connect-HVCGPnPOnline -Url $SiteUrl -Report $Report

  $definitions = @(Get-HVCGListDefinitions -RepoRoot $RepoRoot)
  $fatalErrors = [System.Collections.Generic.List[string]]::new()

  # Pass 1: lists + non-lookup columns
  foreach ($listDef in $definitions) {
    $existing = Invoke-HVCGPnPWithRetry -OperationName "Get-PnPList:$($listDef.title)" -Report $Report -ScriptBlock {
      Get-PnPList -Identity $listDef.title -ErrorAction SilentlyContinue
    }
    if (-not $existing) {
      if ($WhatIf) {
        Write-HVCGLog -Level INFO -Message "WhatIf: create list $($listDef.title)" -Report $Report
        continue
      }
      Invoke-HVCGPnPWithRetry -OperationName "New-PnPList:$($listDef.title)" -Report $Report -ScriptBlock {
        New-PnPList -Title $listDef.title -Template GenericList -OnQuickLaunch -ErrorAction Stop | Out-Null
      }
      $null = Wait-HVCGPnPListVisible -ListTitle $listDef.title -Report $Report
      Write-HVCGLog -Level SUCCESS -Message "Created list $($listDef.title)" -Report $Report
      $Report.ResourcesCreated.Add("List:$($listDef.title)")
    }
    else {
      $Report.ResourcesSkipped.Add("List:$($listDef.title)")
    }

    foreach ($col in $listDef.columns) {
      $c = Get-HVCGColumnSchemaFacade -Column $col
      if ($c.Type -eq 'Lookup') { continue }
      try {
        $null = Add-HVCGFieldFromSchema -ListTitle $listDef.title -Column $col -Report $Report -WhatIf:$WhatIf
      }
      catch {
        $fatalErrors.Add("$($listDef.title).$($c.InternalName): $($_.Exception.Message)")
        if (-not $c.Required) {
          # Still fatal for any field create failure so schema stays complete
        }
      }
    }
  }

  if (-not $SkipLookups) {
    Write-HVCGLog -Level STEP -Message "Adding lookup columns (pass 2)" -Report $Report
    foreach ($listDef in $definitions) {
      if (-not (Get-PnPList -Identity $listDef.title -ErrorAction SilentlyContinue)) { continue }
      foreach ($col in $listDef.columns) {
        $c = Get-HVCGColumnSchemaFacade -Column $col
        if ($c.Type -ne 'Lookup') { continue }
        try {
          $null = Add-HVCGFieldFromSchema -ListTitle $listDef.title -Column $col -Report $Report -WhatIf:$WhatIf
        }
        catch {
          $fatalErrors.Add("$($listDef.title).$($c.InternalName): $($_.Exception.Message)")
        }
      }
    }
  }

  if ($fatalErrors.Count -gt 0 -and -not $WhatIf) {
    throw "Field provisioning failed ($($fatalErrors.Count) errors). First: $($fatalErrors[0])"
  }

  if (-not $WhatIf) {
    Assert-HVCGSharePointSchemaCompliance -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report -Phase 'post-list-provision'
  }
}

function Install-HVCGViews {
  param([string]$SiteUrl, [string]$RepoRoot, $Report, [switch]$WhatIf)
  $viewsPath = Join-Path $RepoRoot 'src/sharepoint/views/command-center-views.json'
  if (-not (Test-Path $viewsPath)) { return }
  Write-HVCGLog -Level STEP -Message "Provisioning views (gated on field existence)" -Report $Report
  Connect-HVCGPnPOnline -Url $SiteUrl -Report $Report
  Assert-HVCGSharePointSchemaCompliance -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report -Phase 'pre-views'

  $views = (Get-Content $viewsPath -Raw | ConvertFrom-Json).views
  foreach ($v in $views) {
    $existing = Get-PnPView -List $v.list -Identity $v.title -ErrorAction SilentlyContinue
    if ($existing) {
      $Report.ResourcesSkipped.Add("View:$($v.list).$($v.title)")
      continue
    }
    $missingFields = @()
    foreach ($fname in @($v.fields)) {
      if ($fname -eq 'Title') { continue }
      if (-not (Get-PnPField -List $v.list -Identity $fname -ErrorAction SilentlyContinue)) {
        $missingFields += $fname
      }
    }
    if ($missingFields.Count -gt 0) {
      $msg = "View $($v.list)/$($v.title) blocked — missing fields: $($missingFields -join ', ')"
      Write-HVCGLog -Level ERROR -Message $msg -Report $Report
      throw $msg
    }
    if ($WhatIf) {
      Write-HVCGLog -Level INFO -Message "WhatIf: view $($v.list)/$($v.title)" -Report $Report
      continue
    }
    try {
      Invoke-HVCGPnPWithRetry -OperationName "Add-PnPView:$($v.list).$($v.title)" -Report $Report -ScriptBlock {
        Add-PnPView -List $v.list -Title $v.title -Fields $v.fields -ErrorAction Stop | Out-Null
      }
      $Report.ResourcesCreated.Add("View:$($v.list).$($v.title)")
      Write-HVCGLog -Level SUCCESS -Message "Created view $($v.list)/$($v.title)" -Report $Report
    }
    catch {
      $msg = "View $($v.list)/$($v.title): $($_.Exception.Message)"
      Write-HVCGLog -Level ERROR -Message $msg -Report $Report
      throw $msg
    }
  }
}


function Install-HVCGKnowledgeTemplates {
  param([string]$KnowledgeUrl, [string]$RepoRoot, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Uploading project templates to Knowledge Center" -Report $Report
  Connect-HVCGPnPOnline -Url $KnowledgeUrl -Report $Report

  $libName = 'ProjectTemplates'
  $existingLib = Invoke-HVCGPnPWithRetry -OperationName "Get-PnPList:$libName" -Report $Report -ScriptBlock {
    Get-PnPList -Identity $libName -ErrorAction SilentlyContinue
  }
  if (-not $existingLib) {
    if (-not $WhatIf) {
      Invoke-HVCGPnPWithRetry -OperationName "New-PnPList:$libName" -Report $Report -ScriptBlock {
        New-PnPList -Title $libName -Template DocumentLibrary -ErrorAction Stop | Out-Null
      }
      $null = Wait-HVCGPnPListVisible -ListTitle $libName -Report $Report
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
    $fileName = $_.Name
    $fullPath = $_.FullName
    Invoke-HVCGPnPWithRetry -OperationName "Add-PnPFile:$fileName" -Report $Report -ScriptBlock {
      Add-PnPFile -Path $fullPath -Folder $libName -ErrorAction Stop | Out-Null
    }
    $Report.ResourcesUpdated.Add("TemplateUpload:$fileName")
  }
}

function ConvertTo-HVCGSeedClientValues {
  <#
  .SYNOPSIS
    Build HVCG_Clients seed Values hashtable from demo-pack client object (StrictMode-safe).

  .NOTES
    Do not write: Test-HVCGHasProperty ... -Name 'X' -and $obj.X
    PowerShell argument mode treats -and as a parameter name ("parameter name 'and'").
    Prefer Get-HVCGPropertyValue, then a separate truthiness check.
  #>
  param(
    [Parameter(Mandatory)]
    $Client
  )
  $vals = @{
    Title                       = $Client.Title
    ClientCode                  = $Client.ClientCode
    ClientStage                 = $Client.ClientStage
    RelationshipOwnerEmail      = $Client.RelationshipOwnerEmail
    ProjectManagerEmail         = $Client.ProjectManagerEmail
    OverallHealth               = $Client.OverallHealth
    RiskLevel                   = $Client.RiskLevel
    PaymentStatus               = $Client.PaymentStatus
    IsActive                    = [bool]$Client.IsActive
    RequiresExecutiveAttention  = [bool]$Client.RequiresExecutiveAttention
    HVCG_IdempotencyKey         = "client|$($Client.ClientCode)"
  }

  $dba = Get-HVCGPropertyValue -Object $Client -Name 'DBA' -Default $null
  if (-not [string]::IsNullOrWhiteSpace([string]$dba)) {
    $vals.DBA = $dba
  }

  $industry = Get-HVCGPropertyValue -Object $Client -Name 'Industry' -Default $null
  if (-not [string]::IsNullOrWhiteSpace([string]$industry)) {
    $vals.Industry = $industry
  }

  $retainer = Get-HVCGPropertyValue -Object $Client -Name 'MonthlyRetainer' -Default $null
  if ($null -ne $retainer) {
    $vals.MonthlyRetainer = [double]$retainer
  }

  # Comma prevents pipeline enumeration of hashtable DictionaryEntry items.
  return , $vals
}

function Install-HVCGSeedData {
  param([string]$SiteUrl, [string]$RepoRoot, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Seeding Development sample data (gated on field existence)" -Report $Report
  if ($WhatIf) { return }
  Connect-HVCGPnPOnline -Url $SiteUrl -Report $Report
  Assert-HVCGSharePointSchemaCompliance -SiteUrl $SiteUrl -RepoRoot $RepoRoot -Report $Report -Phase 'pre-seed'

  function Assert-HVCGListFields {
    param([string]$ListTitle, [string[]]$Fields)
    $missing = @()
    foreach ($f in $Fields) {
      if ($f -eq 'Title') { continue }
      if (-not (Get-PnPField -List $ListTitle -Identity $f -ErrorAction SilentlyContinue)) {
        $missing += $f
      }
    }
    if ($missing.Count -gt 0) {
      throw "Seed blocked for $ListTitle — missing fields: $($missing -join ', ')"
    }
  }

  Assert-HVCGListFields -ListTitle 'HVCG_TeamMembers' -Fields @('Title', 'Email', 'PrimaryRole', 'IsActive', 'CapacityHoursPerWeek')
  Assert-HVCGListFields -ListTitle 'HVCG_Clients' -Fields @('Title', 'ClientCode', 'ClientStage', 'RelationshipOwnerEmail', 'ProjectManagerEmail', 'OverallHealth', 'RiskLevel', 'PaymentStatus', 'IsActive', 'RequiresExecutiveAttention', 'HVCG_IdempotencyKey', 'DBA', 'Industry', 'MonthlyRetainer')
  Assert-HVCGListFields -ListTitle 'HVCG_Templates' -Fields @('Title', 'TemplateKey', 'TemplateType', 'ConfigJsonPath', 'IsActive')

  $demo = Get-Content (Join-Path $RepoRoot 'sample-data/demo-pack.json') -Raw | ConvertFrom-Json

  foreach ($tm in $demo.teamMembers) {
    $found = Get-PnPListItem -List 'HVCG_TeamMembers' -Query "<View><Query><Where><Eq><FieldRef Name='Email'/><Value Type='Text'>$($tm.Email)</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
    if ($found) {
      $Report.ResourcesSkipped.Add("Seed:Team:$($tm.Email)")
      continue
    }
    Invoke-HVCGPnPWithRetry -OperationName "Add-PnPListItem:HVCG_TeamMembers:$($tm.Email)" -Report $Report -ScriptBlock {
      Add-PnPListItem -List 'HVCG_TeamMembers' -Values @{
        Title = $tm.Title; Email = $tm.Email; PrimaryRole = $tm.PrimaryRole; IsActive = $true; CapacityHoursPerWeek = [double]$tm.CapacityHoursPerWeek
      } -ErrorAction Stop | Out-Null
    }
    $Report.ResourcesCreated.Add("Seed:Team:$($tm.Email)")
  }

  foreach ($c in $demo.clients) {
    $found = Get-PnPListItem -List 'HVCG_Clients' -Query "<View><Query><Where><Eq><FieldRef Name='ClientCode'/><Value Type='Text'>$($c.ClientCode)</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
    if ($found) {
      $Report.ResourcesSkipped.Add("Seed:Client:$($c.ClientCode)")
      continue
    }
    $vals = ConvertTo-HVCGSeedClientValues -Client $c
    Invoke-HVCGPnPWithRetry -OperationName "Add-PnPListItem:HVCG_Clients:$($c.ClientCode)" -Report $Report -ScriptBlock {
      Add-PnPListItem -List 'HVCG_Clients' -Values $vals -ErrorAction Stop | Out-Null
    }
    $Report.ResourcesCreated.Add("Seed:Client:$($c.ClientCode)")
  }

  $tindex = Get-Content (Join-Path $RepoRoot 'templates/projects/_index.json') -Raw | ConvertFrom-Json
  foreach ($t in $tindex.templates) {
    $found = Get-PnPListItem -List 'HVCG_Templates' -Query "<View><Query><Where><Eq><FieldRef Name='TemplateKey'/><Value Type='Text'>$($t.templateKey)</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
    if ($found) {
      $Report.ResourcesSkipped.Add("Seed:Template:$($t.templateKey)")
      continue
    }
    Invoke-HVCGPnPWithRetry -OperationName "Add-PnPListItem:HVCG_Templates:$($t.templateKey)" -Report $Report -ScriptBlock {
      Add-PnPListItem -List 'HVCG_Templates' -Values @{
        Title = $t.title
        TemplateKey = $t.templateKey
        TemplateType = 'Project'
        ConfigJsonPath = "ProjectTemplates/$($t.templateKey).json"
        IsActive = $true
      } -ErrorAction Stop | Out-Null
    }
    $Report.ResourcesCreated.Add("Seed:Template:$($t.templateKey)")
  }
}

function Install-HVCGSampleClientWorkspace {
  param([string]$ClientsUrl, [string]$ClientCode, [string]$RepoRoot, $Report, [switch]$WhatIf)
  Write-HVCGLog -Level STEP -Message "Creating sample client workspace $ClientCode" -Report $Report
  if ($WhatIf) { return }
  $cfg = Get-Content (Join-Path $RepoRoot 'config/hvcg.config.json') -Raw | ConvertFrom-Json
  Connect-HVCGPnPOnline -Url $ClientsUrl -Report $Report
  $libraryTitle = "HVCG_$ClientCode"
  $existingClientLib = Invoke-HVCGPnPWithRetry -OperationName "Get-PnPList:$libraryTitle" -Report $Report -ScriptBlock {
    Get-PnPList -Identity $libraryTitle -ErrorAction SilentlyContinue
  }
  if (-not $existingClientLib) {
    Invoke-HVCGPnPWithRetry -OperationName "New-PnPList:$libraryTitle" -Report $Report -ScriptBlock {
      New-PnPList -Title $libraryTitle -Template DocumentLibrary -ErrorAction Stop | Out-Null
    }
    $null = Wait-HVCGPnPListVisible -ListTitle $libraryTitle -Report $Report
    $Report.ResourcesCreated.Add("ClientLibrary:$libraryTitle")
  }
  else {
    $Report.ResourcesSkipped.Add("ClientLibrary:$libraryTitle")
  }
  foreach ($folder in $cfg.documentFolderStructure) {
    $folderPath = "$libraryTitle/$folder"
    Invoke-HVCGPnPWithRetry -OperationName "Resolve-PnPFolder:$folderPath" -Report $Report -ScriptBlock {
      Resolve-PnPFolder -SiteRelativePath $folderPath -ErrorAction Stop | Out-Null
    }
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
