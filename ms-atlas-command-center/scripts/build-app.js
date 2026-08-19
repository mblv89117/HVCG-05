// Build + publish the Project Atlas Command Center model-driven app in HVCG Development.
// Adds tables via their default forms/views (entity MetadataId AddAppComponents is blocked).
// No Production changes.
import { dv, DEV_RESOURCE } from './dv.js';
import { PREFIX, SOLUTION_UNIQUE } from './schema.js';

const log = (...a) => console.log(...a);

// pac-created app — has a valid app-aware sitemap we edit in place.
const APP_ID = 'dea8a490-4b82-f111-ab0e-6045bd0193e8';
const APP_SITEMAP_ID = '2af694ae-0114-4a79-986d-543b60d5ef3f';
const APP_UNIQUE = 'atlas_command_center_005b1424';
const APP_NAME = 'Project Atlas Command Center';
const DUP_APP_ID = '60d2602c-4b82-f111-ab0e-6045bd0194a3';

const SUBAREAS = {
  Executive: [
    [`${PREFIX}_atlasbrief`, 'Executive Home'],
    [`${PREFIX}_atlastrack`, 'Portfolio'],
    [`${PREFIX}_atlasrevenuekpi`, 'Revenue Summary'],
  ],
  Delivery: [
    [`${PREFIX}_atlassprint`, 'Sprint Center'],
    [`${PREFIX}_atlasagent`, 'Agent Control Center'],
    [`${PREFIX}_atlasrelease`, 'Release Center'],
  ],
  Decisions: [
    [`${PREFIX}_atlasapproval`, 'Owner Approval Inbox'],
    [`${PREFIX}_atlaschangerequest`, 'Change Request Center'],
    [`${PREFIX}_atlasuatfeedback`, 'UAT Feedback'],
  ],
  'Risk & Reference': [
    [`${PREFIX}_atlasrisk`, 'Risks'],
    [`${PREFIX}_atlasblocker`, 'Blockers'],
    [`${PREFIX}_atlastechnicaldebt`, 'Technical Debt'],
    [`${PREFIX}_atlasdatasource`, 'Data Sources'],
  ],
};

const ALL_ENTITIES = Object.values(SUBAREAS).flat().map(([e]) => e);
const titles = (t) => `<Titles><Title Title="${t}" LCID="1033" /></Titles>`;

function buildSitemapXml() {
  let groups = '';
  let idx = 0;
  for (const [groupTitle, subs] of Object.entries(SUBAREAS)) {
    const gid = `grp_${idx++}`;
    let subXml = '';
    for (const [entity, title] of subs) {
      subXml += `<SubArea Id="sa_${entity}" Entity="${entity}" IntroducedVersion="7.0.0.0" Client="All" AvailableOffline="false" PassParams="false">${titles(title)}</SubArea>`;
    }
    groups += `<Group Id="${gid}" IntroducedVersion="7.0.0.0">${titles(groupTitle)}${subXml}</Group>`;
  }
  return `<SiteMap IntroducedVersion="7.0.0.0"><Area Id="atlas_area" ShowGroups="true" IntroducedVersion="7.0.0.0">${titles('Project Atlas')}${groups}</Area></SiteMap>`;
}

async function addOne(appId, component) {
  try {
    await dv.action('AddAppComponents', { AppId: appId, Components: [component] });
    return true;
  } catch (e) {
    const msg = String(e.message);
    if (msg.includes('already') || msg.includes('duplicate') || msg.includes('exists')) return true;
    log(`  skip: ${msg.slice(0, 140)}`);
    return false;
  }
}

async function addTableComponents(appId, logical) {
  // Main form (type 2) + Active public view (querytype 0, name starts with Active)
  const forms = await dv.get(`systemforms?$select=formid,name,type&$filter=objecttypecode eq '${logical}' and type eq 2`);
  const views = await dv.get(`savedqueries?$select=savedqueryid,name,querytype&$filter=returnedtypecode eq '${logical}' and querytype eq 0`);
  let added = 0;
  for (const f of forms.value || []) {
    if (await addOne(appId, { '@odata.type': 'Microsoft.Dynamics.CRM.systemform', formid: f.formid })) added++;
  }
  // Prefer Active view; fall back to first public view
  const preferred = (views.value || []).find((v) => /^Active /i.test(v.name)) || (views.value || [])[0];
  if (preferred) {
    if (await addOne(appId, { '@odata.type': 'Microsoft.Dynamics.CRM.savedquery', savedqueryid: preferred.savedqueryid })) added++;
  }
  // Also add "My" UCI view if present (querytype 8192)
  const myViews = await dv.get(`savedqueries?$select=savedqueryid,name&$filter=returnedtypecode eq '${logical}' and querytype eq 8192`);
  for (const v of myViews.value || []) {
    if (await addOne(appId, { '@odata.type': 'Microsoft.Dynamics.CRM.savedquery', savedqueryid: v.savedqueryid })) added++;
  }
  log(`  ${logical}: +${added} form/view components`);
}

async function addAllTables(appId) {
  log('Adding tables via forms/views...');
  for (const e of ALL_ENTITIES) await addTableComponents(appId, e);
}

async function ensureSitemap() {
  // Must preserve original Area/Group IDs; PublishXml required before GET reflects changes.
  const { spawnSync } = await import('node:child_process');
  const { fileURLToPath } = await import('node:url');
  const { dirname, join } = await import('node:path');
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const r = spawnSync(process.execPath, [join(root, 'scripts/update-sitemap.js')], {
    cwd: root,
    encoding: 'utf8',
  });
  if (r.stdout) log(r.stdout.trim());
  if (r.status !== 0) {
    log(r.stderr || 'update-sitemap failed');
    throw new Error('Sitemap update failed');
  }
  await dv.action('PublishXml', {
    ParameterXml: `<importexportxml><sitemaps><sitemap>${APP_SITEMAP_ID}</sitemap></sitemaps></importexportxml>`,
  });
  log('Sitemap published.');
}

async function associateRoles(appId) {
  const names = ['System Administrator', 'System Customizer'];
  for (const name of names) {
    try {
      const r = await dv.get(`roles?$select=roleid,name&$filter=name eq '${name}'&$top=5`);
      for (const role of r.value || []) {
        try {
          await dv.post(`appmodules(${appId})/appmoduleroles_association/$ref`, {
            '@odata.id': `${DEV_RESOURCE}/api/data/v9.2/roles(${role.roleid})`,
          });
          log(`Associated role: ${name} (${role.roleid})`);
        } catch (e) {
          log(`Role note (${name}): ${String(e.message).slice(0, 100)}`);
        }
      }
    } catch (e) {
      log(`Role lookup note (${name}): ${String(e.message).slice(0, 100)}`);
    }
  }
}

async function validateAndPublish(appId) {
  try {
    const v = await dv.get(`ValidateApp(AppModuleId=${appId})`);
    const resp = v.AppValidationResponse || v;
    const results = resp.ValidationIssueList || [];
    log(`ValidateApp success=${resp.ValidationSuccess} issues=${results.length}`);
    results.slice(0, 25).forEach((x) => log(`  [${x.ErrorType}] ${x.Message}`));
  } catch (e) {
    log(`ValidateApp note: ${String(e.message).slice(0, 200)}`);
  }

  // Publish the specific app module
  try {
    await dv.action('PublishXml', {
      ParameterXml: `<importexportxml><appmodules><appmodule>${appId}</appmodule></appmodules></importexportxml>`,
    });
    log('PublishXml (appmodule) done.');
  } catch (e) {
    log(`PublishXml note: ${String(e.message).slice(0, 160)}`);
  }

  await dv.action('PublishAllXml', {});
  log('PublishAllXml done.');
}

async function removeDuplicate() {
  try {
    await dv.del(`appmodules(${DUP_APP_ID})`);
    log(`Removed duplicate app ${DUP_APP_ID}`);
  } catch (e) {
    log(`Duplicate removal note: ${String(e.message).slice(0, 120)}`);
  }
}

async function main() {
  log(`Building app ${APP_ID} (${APP_UNIQUE}) as "${APP_NAME}"`);
  await addAllTables(APP_ID);
  await ensureSitemap();
  await associateRoles(APP_ID);
  await validateAndPublish(APP_ID);
  await removeDuplicate();

  const playUrl = `${DEV_RESOURCE}/main.aspx?appid=${APP_ID}`;
  const makerUrl = `https://make.powerapps.com/environments/c03b1329-4394-ece7-acc9-c50794b3db1e/apps/${APP_ID}/details`;
  log('\n=== APP READY ===');
  log(`App name: ${APP_NAME}`);
  log(`App unique: ${APP_UNIQUE}`);
  log(`App id: ${APP_ID}`);
  log(`Play: ${playUrl}`);
  log(`Maker: ${makerUrl}`);
  console.log(JSON.stringify({ appId: APP_ID, appUnique: APP_UNIQUE, playUrl, makerUrl }));
}

main().catch((e) => { console.error('BUILD_FAIL', e.message); process.exit(1); });
