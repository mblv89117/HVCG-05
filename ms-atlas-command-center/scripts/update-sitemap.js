// Update sitemap for the Atlas Command Center app (Dev only).
import { dv, DEV_RESOURCE } from './dv.js';
import { getToken } from './auth.js';
import { PREFIX } from './schema.js';

const SITEMAP_ID = '2af694ae-0114-4a79-986d-543b60d5ef3f';
const titles = (t) => `<Titles><Title Title="${t}" LCID="1033" /></Titles>`;

const ENTITIES = [
  [`${PREFIX}_atlasbrief`, 'Executive Home'],
  [`${PREFIX}_atlastrack`, 'Portfolio'],
  [`${PREFIX}_atlasrevenuekpi`, 'Revenue Summary'],
  [`${PREFIX}_atlassprint`, 'Sprint Center'],
  [`${PREFIX}_atlasagent`, 'Agent Control Center'],
  [`${PREFIX}_atlasrelease`, 'Release Center'],
  [`${PREFIX}_atlasapproval`, 'Owner Approval Inbox'],
  [`${PREFIX}_atlaschangerequest`, 'Change Request Center'],
  [`${PREFIX}_atlasuatfeedback`, 'UAT Feedback'],
  [`${PREFIX}_atlasrisk`, 'Risks'],
  [`${PREFIX}_atlasblocker`, 'Blockers'],
  [`${PREFIX}_atlastechnicaldebt`, 'Technical Debt'],
  [`${PREFIX}_atlasdatasource`, 'Data Sources'],
];

function subAreas(items) {
  return items.map(([entity, title]) =>
    `<SubArea Id="sa_${entity}" Entity="${entity}" IntroducedVersion="7.0.0.0" Client="All,Outlook,OutlookLaptopClient,OutlookWorkstationClient,Web" AvailableOffline="false" PassParams="false" Sku="All,OnPremise,Live,SPLA">${titles(title)}</SubArea>`
  ).join('');
}

async function patch(label, xml) {
  const token = await getToken();
  const res = await fetch(`${DEV_RESOURCE}/api/data/v9.2/sitemaps(${SITEMAP_ID})`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sitemapxml: xml }),
  });
  const text = await res.text();
  console.log(label, res.status, text.slice(0, 250));
  return res.ok;
}

async function main() {
  // Prefer: all screens in one group preserving original Area/Group IDs
  const single = `<SiteMap IntroducedVersion="7.0.0.0"><Area Id="area_atlas_command_center_005b1424" ShowGroups="true" ResourceId="SitemapDesigner.NewArea" IntroducedVersion="7.0.0.0">${titles('Project Atlas')}<Group Id="group_atlas_command_center_005b1424" IsProfile="false" ResourceId="SitemapDesigner.NewGroup" IntroducedVersion="7.0.0.0">${titles('Command Center')}${subAreas(ENTITIES)}</Group></Area></SiteMap>`;

  if (await patch('single-group all entities', single)) {
    const check = await dv.get(`sitemaps(${SITEMAP_ID})?$select=sitemapxml`);
    console.log('OK XML length', check.sitemapxml.length);
    console.log(check.sitemapxml);
    return;
  }

  // Fallback: incremental — add entities one at a time onto current sitemap
  console.log('Falling back to incremental...');
  let current = (await dv.get(`sitemaps(${SITEMAP_ID})?$select=sitemapxml`)).sitemapxml;
  for (const [entity, title] of ENTITIES) {
    if (current.includes(`Entity="${entity}"`)) {
      console.log('already has', entity);
      continue;
    }
    const sub = `<SubArea Id="sa_${entity}" Entity="${entity}" IntroducedVersion="7.0.0.0" Client="All,Outlook,OutlookLaptopClient,OutlookWorkstationClient,Web" AvailableOffline="false" PassParams="false" Sku="All,OnPremise,Live,SPLA">${titles(title)}</SubArea>`;
    // insert before </Group>
    const next = current.replace('</Group>', `${sub}</Group>`);
    if (await patch(`add ${entity}`, next)) {
      current = next;
    } else {
      console.log('FAILED at', entity);
      break;
    }
  }
  const final = await dv.get(`sitemaps(${SITEMAP_ID})?$select=sitemapxml`);
  console.log('FINAL:\n', final.sitemapxml);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
