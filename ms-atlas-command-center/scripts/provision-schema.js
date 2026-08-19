// Provision the Project Atlas Command Center solution + tables in HVCG Development.
// Idempotent: safe to re-run. Creates nothing in Production.
import { dv, label } from './dv.js';
import { PREFIX, SOLUTION_UNIQUE, SOLUTION_FRIENDLY, TABLES } from './schema.js';

const solHeader = { 'MSCRM.SolutionUniqueName': SOLUTION_UNIQUE };
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TRANSIENT = ['An unexpected error occurred', '404', '429', 'timeout', 'temporarily', 'ObjectDoesNotExist', 'does not exist'];
function isTransient(msg) { return TRANSIENT.some((t) => String(msg).includes(t)); }

// Retry transient metadata errors (Dataverse metadata is eventually consistent).
async function withRetry(fn, { tries = 6, base = 3000 } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); } catch (e) {
      last = e;
      if (!isTransient(e.message) || i === tries - 1) throw e;
      await sleep(base * (i + 1));
    }
  }
  throw last;
}

async function ensurePublisher() {
  const r = await dv.get(`publishers?$select=publisherid,customizationprefix,uniquename&$filter=customizationprefix eq '${PREFIX}'`);
  if (!r.value?.length) throw new Error(`No publisher with prefix '${PREFIX}' found`);
  const p = r.value[0];
  log(`Publisher: ${p.uniquename} (prefix ${p.customizationprefix}) ${p.publisherid}`);
  return p.publisherid;
}

async function ensureSolution(publisherId) {
  const r = await dv.get(`solutions?$select=solutionid,uniquename&$filter=uniquename eq '${SOLUTION_UNIQUE}'`);
  if (r.value?.length) {
    log(`Solution exists: ${SOLUTION_UNIQUE} ${r.value[0].solutionid}`);
    return r.value[0].solutionid;
  }
  const res = await dv.post('solutions', {
    uniquename: SOLUTION_UNIQUE,
    friendlyname: SOLUTION_FRIENDLY,
    version: '1.0.0.0',
    description: 'Development/UAT executive command center. No live client actions.',
    'publisherid@odata.bind': `/publishers(${publisherId})`,
  });
  log(`Solution created: ${SOLUTION_UNIQUE} ${res.__entityId}`);
  return res.__entityId;
}

async function entityExists(schema) {
  const logical = schema.toLowerCase();
  try {
    const r = await dv.get(`EntityDefinitions(LogicalName='${logical}')?$select=MetadataId`);
    return r.MetadataId || null;
  } catch (e) {
    if (String(e.message).includes('404') || String(e.message).includes("Could not find")) return null;
    throw e;
  }
}

async function existingAttributes(schema) {
  const logical = schema.toLowerCase();
  const r = await dv.get(`EntityDefinitions(LogicalName='${logical}')/Attributes?$select=SchemaName`);
  return new Set((r.value || []).map((a) => (a.SchemaName || '').toLowerCase()));
}

async function createTable(t) {
  const primary = t.attributes.find((a) => a.IsPrimaryName);
  const body = {
    '@odata.type': 'Microsoft.Dynamics.CRM.EntityMetadata',
    SchemaName: t.schema,
    DisplayName: label(t.display),
    DisplayCollectionName: label(t.plural),
    Description: label(t.description),
    OwnershipType: 'UserOwned',
    IsActivity: false,
    HasNotes: !!t.hasNotes,
    HasActivities: false,
    Attributes: [primary],
  };
  const res = await withRetry(() => dv.post('EntityDefinitions', body, solHeader));
  log(`  table created: ${t.schema}`);
  // give metadata a moment to become consistent before adding columns
  await sleep(4000);
  return res;
}

async function addAttribute(schema, attr) {
  const logical = schema.toLowerCase();
  await withRetry(() => dv.post(`EntityDefinitions(LogicalName='${logical}')/Attributes`, attr, solHeader));
  log(`    + ${attr.SchemaName}`);
}

async function ensureInSolution(schema) {
  // AddSolutionComponent for the entity (componenttype 1 = Entity). Ensures table is in the solution.
  const logical = schema.toLowerCase();
  try {
    const meta = await withRetry(() => dv.get(`EntityDefinitions(LogicalName='${logical}')?$select=MetadataId`));
    await dv.action('AddSolutionComponent', {
      ComponentId: meta.MetadataId,
      ComponentType: 1,
      SolutionUniqueName: SOLUTION_UNIQUE,
      AddRequiredComponents: false,
      DoNotIncludeSubcomponents: false,
    });
  } catch (e) {
    // Non-fatal: table is already added via the create-time solution header.
    log(`    (solution add note: ${String(e.message).slice(0, 100)})`);
  }
}

async function main() {
  const publisherId = await ensurePublisher();
  await ensureSolution(publisherId);

  const failures = [];
  for (const t of TABLES) {
    log(`Table ${t.schema} (${t.display})`);
    let existed = await entityExists(t.schema);
    if (!existed) {
      try {
        await createTable(t);
      } catch (e) {
        log(`  ! create failed: ${e.message}`);
        failures.push(`${t.schema}: ${e.message}`);
        continue;
      }
    } else {
      log(`  exists, ensuring columns`);
    }
    // add remaining attributes
    let have = new Set();
    try { have = await withRetry(() => existingAttributes(t.schema)); } catch { /* new table: fetch may lag */ }
    for (const a of t.attributes) {
      if (a.IsPrimaryName) continue;
      if (have.has(a.SchemaName.toLowerCase())) continue;
      try {
        await addAttribute(t.schema, a);
      } catch (e) {
        log(`    ! ${a.SchemaName} failed: ${e.message.slice(0, 160)}`);
        failures.push(`${t.schema}.${a.SchemaName}: ${e.message}`);
      }
    }
    await ensureInSolution(t.schema);
  }

  log('\nPublishing customizations...');
  await dv.action('PublishAllXml', {});
  log('Published.');

  if (failures.length) {
    log(`\n${failures.length} issue(s):`);
    failures.forEach((f) => log(' - ' + f));
    process.exitCode = 2;
  } else {
    log('\nAll tables + columns provisioned cleanly.');
  }
}

main().catch((e) => { console.error('PROVISION_FAIL', e.message); process.exit(1); });
