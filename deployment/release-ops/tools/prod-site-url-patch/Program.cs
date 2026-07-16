using Microsoft.PowerPlatform.Dataverse.Client;
using Microsoft.Xrm.Sdk;
using Microsoft.Xrm.Sdk.Query;
using System.Text.Json;

var url = "https://orgee2f7545.crm.dynamics.com";
const string appId = "51f81489-12ee-4a9e-aaae-a2591f45987d";
var workflowId = Guid.Parse("1716e663-153f-5588-af1a-56f3fb9ec2d4");
var path = "/Volumes/MacMiniPro2TB/HVCG Project Management System/.worktrees/deployment-engineer/deployment/release-ops/evidence/leadqualified-clientdata-prod-site.compact.json";

var svc = new ServiceClient($"AuthType=OAuth;Url={url};AppId={appId};RedirectUri=http://localhost;LoginPrompt=Auto;RequireNewInstance=true");
if (!svc.IsReady) { Console.Error.WriteLine(svc.LastError); return 2; }

var before = svc.Retrieve("workflow", workflowId, new ColumnSet("name", "statecode", "clientdata", "ismanaged"));
var beforeCd = before.GetAttributeValue<string>("clientdata") ?? "";
Console.WriteLine($"BEFORE name={before.GetAttributeValue<string>("name")} state={before.GetAttributeValue<OptionSetValue>("statecode")?.Value} managed={before.GetAttributeValue<bool?>("ismanaged")} hasDev={beforeCd.Contains("HVCG-CommandCenter-Dev")}");

var clientdata = JsonSerializer.Serialize(JsonSerializer.Deserialize<JsonElement>(await File.ReadAllTextAsync(path)));

try
{
  svc.Execute(new OrganizationRequest("SetState")
  {
    ["EntityMoniker"] = new EntityReference("workflow", workflowId),
    ["State"] = new OptionSetValue(0),
    ["Status"] = new OptionSetValue(1)
  });
  Console.WriteLine("SetState Draft OK");
}
catch (Exception ex)
{
  Console.WriteLine("SetState Draft: " + ex.Message);
}

try
{
  svc.Update(new Entity("workflow", workflowId) { ["clientdata"] = clientdata });
  Console.WriteLine("PATCHED OK site URL -> Prod Command Center");
}
catch (Exception ex)
{
  Console.WriteLine("PATCH FAIL: " + ex.Message);
  try
  {
    svc.Execute(new OrganizationRequest("SetState")
    {
      ["EntityMoniker"] = new EntityReference("workflow", workflowId),
      ["State"] = new OptionSetValue(1),
      ["Status"] = new OptionSetValue(2)
    });
  }
  catch { /* best-effort */ }
  return 1;
}

svc.Execute(new OrganizationRequest("SetState")
{
  ["EntityMoniker"] = new EntityReference("workflow", workflowId),
  ["State"] = new OptionSetValue(1),
  ["Status"] = new OptionSetValue(2)
});
Console.WriteLine("SetState Activated OK");

var after = svc.Retrieve("workflow", workflowId, new ColumnSet("statecode", "clientdata", "modifiedon"));
var afterCd = after.GetAttributeValue<string>("clientdata") ?? "";
var hasDev = afterCd.Contains("HVCG-CommandCenter-Dev");
var hasProd = afterCd.Contains("sites/HVCG-CommandCenter");
Console.WriteLine($"AFTER state={after.GetAttributeValue<OptionSetValue>("statecode")?.Value} mod={after.GetAttributeValue<DateTime>("modifiedon"):o}");
Console.WriteLine($"AFTER hasDev={hasDev} hasProd={hasProd}");
return hasDev ? 3 : 0;
