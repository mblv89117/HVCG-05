#Requires -Version 7.0
<#
.SYNOPSIS
  Instantiates a project from a template JSON into SharePoint lists (dev/util script).
  Production path prefers Power Automate flow HVCG_CreateProjectFromTemplate.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SiteUrl,
  [Parameter(Mandatory = $true)][string]$TemplateKey,
  [Parameter(Mandatory = $true)][int]$ClientListItemId,
  [Parameter(Mandatory = $true)][string]$ClientCode,
  [Parameter(Mandatory = $false)][int]$EngagementListItemId,
  [Parameter(Mandatory = $false)][string]$ProjectTitle,
  [Parameter(Mandatory = $false)][datetime]$StartDate = (Get-Date).Date,
  [Parameter(Mandatory = $false)][string]$TemplatesRoot = (Join-Path $PSScriptRoot "../../templates/projects")
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Import-Module (Join-Path $RepoRoot 'deployment/lib/HVCG.Deployment.psm1') -Force
$Report = New-HVCGDeploymentReport -Environment 'adhoc-project' -RepoRoot $RepoRoot
$envCfg = Get-Content (Join-Path $RepoRoot 'config/environments/development.json') -Raw | ConvertFrom-Json
$null = Initialize-HVCGPnPAuth -Config $envCfg -Report $Report
$templatePath = Join-Path $TemplatesRoot "$TemplateKey.json"
if (-not (Test-Path $templatePath)) { throw "Template not found: $templatePath" }
$t = Get-Content $templatePath -Raw | ConvertFrom-Json

Connect-HVCGPnPOnline -Url $SiteUrl -Config $envCfg -Report $Report

$title = if ($ProjectTitle) { $ProjectTitle } else { "$($t.title) - $ClientCode" }
$idem = "proj|$ClientCode|$TemplateKey|$($StartDate.ToString('yyyyMMdd'))"

$projValues = @{
  Title              = $title
  ClientCode         = $ClientCode
  ProjectTemplateKey = $TemplateKey
  ProjectStatus      = "Not Started"
  ProjectHealth      = "Green"
  StartDate          = $StartDate
  TargetEndDate      = $StartDate.AddDays([int]$t.defaultDurationDays)
  HVCG_IdempotencyKey = $idem
}

# AtlasClientRef lookup uses HVCG_Clients list item id (proven REST AtlasClientRefId)
$projValues["AtlasClientRef"] = $ClientListItemId
if ($EngagementListItemId) { $projValues["EngagementId"] = $EngagementListItemId }

$existing = Get-PnPListItem -List "HVCG_Projects" -Query "<View><Query><Where><Eq><FieldRef Name='HVCG_IdempotencyKey'/><Value Type='Text'>$idem</Value></Eq></Where></Query></View>" -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "Project already exists for idempotency key $idem (id $($existing.Id))"
  $projectId = $existing.Id
}
else {
  $item = Add-PnPListItem -List "HVCG_Projects" -Values $projValues
  $projectId = $item.Id
  Write-Host "Created project id $projectId"
}

foreach ($m in $t.milestones) {
  $midem = "ms|$idem|$($m.key)"
  Add-PnPListItem -List "HVCG_Milestones" -Values @{
    Title               = $m.title
    ProjectId           = $projectId
    ClientCode          = $ClientCode
    DueDate             = $StartDate.AddDays([int]$m.offsetDays)
    IsCritical          = [bool]$m.isCritical
    Status              = "Pending"
  } | Out-Null
}

foreach ($task in $t.tasks) {
  Add-PnPListItem -List "HVCG_Tasks" -Values @{
    Title            = $task.title
    ProjectId        = $projectId
    ClientCode       = $ClientCode
    Description      = $task.description
    DefaultRole      = $task.defaultRole
    Priority         = $task.priority
    TaskStatus       = "Not Started"
    DueDate          = $StartDate.AddDays([int]$task.offsetDays)
    EstimatedHours   = $task.estimatedHours
    TemplateTaskKey  = $task.key
    DependsOnTaskKeys = ($task.dependsOn -join ";")
    HVCG_IdempotencyKey = "task|$idem|$($task.key)"
  } | Out-Null
}

foreach ($d in $t.requiredDocuments) {
  Add-PnPListItem -List "HVCG_DocumentRequests" -Values @{
    Title             = $d.title
    ClientId          = $ClientListItemId
    ProjectId         = $projectId
    ClientCode        = $ClientCode
    DocumentCategory  = $d.documentCategory
    Description       = $d.description
    RequestDate       = $StartDate
    DueDate           = $StartDate.AddDays([int]$d.dueOffsetDays)
    RequestStatus     = "Requested"
    IsCritical        = [bool]$d.isCritical
    FolderTarget      = $d.folderTarget
    TemplateItemKey   = $d.key
    HVCG_IdempotencyKey = "docreq|$idem|$($d.key)"
  } | Out-Null
}

foreach ($d in $t.deliverables) {
  Add-PnPListItem -List "HVCG_Deliverables" -Values @{
    Title                     = $d.title
    ClientId                  = $ClientListItemId
    ProjectId                 = $projectId
    ClientCode                = $ClientCode
    DeliverableType           = $d.deliverableType
    DraftDueDate              = $StartDate.AddDays([int]$d.draftOffsetDays)
    FinalDueDate              = $StartDate.AddDays([int]$d.finalOffsetDays)
    DeliverableStatus         = "Not Started"
    RequiresExecutiveApproval = [bool]$d.requiresExecutiveApproval
    HVCG_IdempotencyKey       = "del|$idem|$($d.key)"
  } | Out-Null
}

Write-Host "Template instantiation complete for project $projectId"
Disconnect-PnPOnline
