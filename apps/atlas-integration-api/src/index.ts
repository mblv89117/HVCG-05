import { createServer } from 'node:http';
import { loadConfig } from './config.ts';
import { buildRegistry } from './connectors/registry.ts';
import { handleRequest } from './http/router.ts';
import { loadSecretsFile } from './loadSecrets.ts';
import { createLocalAiAdapter } from './local-ai/adapter.ts';
import { createAuthorizedPmRepository } from './pm/backend.ts';
import { IntegrationRepository } from './store/repository.ts';

export function startServer() {
  const secrets = loadSecretsFile();
  if (secrets.loadedFrom) {
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'loaded secrets file',
        path: secrets.loadedFrom,
        keysLoaded: secrets.keysLoaded,
      }),
    );
  } else {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'no .secrets/integration.env found — Microsoft/Google/GitHub will show as not configured',
      }),
    );
  }

  const cfg = loadConfig();
  const repo = new IntegrationRepository(cfg.dataDir, cfg.tokenEncryptionKeyB64);
  const pm = createAuthorizedPmRepository(cfg);
  const localAi = createLocalAiAdapter();
  const app = buildRegistry(cfg, repo);

  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
      console.error(JSON.stringify({ level: 'error', msg: 'unhandled', detail: String(err) }));
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error' }));
    });
  });

  server.listen(cfg.port, cfg.host, () => {
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'atlas-integration-api listening',
        port: cfg.port,
        host: cfg.host,
        authRequired: cfg.requireAuth,
        insecureDevAuth: cfg.insecureDevAuth,
        pmBackend: cfg.pmBackend.mode,
        pmClassification: cfg.pmBackend.classification,
        dataDir: cfg.dataDir,
        microsoftConfigured: Boolean(cfg.microsoft.clientId && cfg.microsoft.clientSecret),
      }),
    );
  });

  return server;
}

startServer();
