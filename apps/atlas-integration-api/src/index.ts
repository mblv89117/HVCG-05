import { createServer } from 'node:http';
import { loadConfig } from './config.ts';
import { buildRegistry } from './connectors/registry.ts';
import { handleRequest } from './http/router.ts';
import { loadSecretsFile } from './loadSecrets.ts';
import { createLocalAiAdapter } from './local-ai/adapter.ts';
import { createAuthorizedPmRepository, createSharePointPmService } from './pm/backend.ts';
import { createFabricGraphClient } from './pm/sharepoint/fabric/graph.ts';
import { runFabricSync } from './pm/sharepoint/fabric/sync.ts';
import { createManagedIdentityTokenProvider, GRAPH_TOKEN_RESOURCE } from './pm/sharepoint/token.ts';
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
  const sharepoint = createSharePointPmService(cfg);
  const localAi = createLocalAiAdapter();
  const app = buildRegistry(cfg, repo);

  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, sharepoint, localAi }, req, res).catch((err) => {
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
    if (process.env.INTEGRATION_FABRIC_BOOTSTRAP === '1' && sharepoint && cfg.pmBackend.sharepoint) {
      const tokenProvider =
        cfg.pmTokenProvider ||
        createManagedIdentityTokenProvider(cfg.pmBackend.sharepoint.managedIdentityClientId, {
          resource: GRAPH_TOKEN_RESOURCE,
          timeoutMs: 15_000,
        });
      const run = async () => {
        let lastErr: unknown;
        for (let attempt = 1; attempt <= 4; attempt += 1) {
          try {
            const result = await runFabricSync({
              service: sharepoint,
              fabric: createFabricGraphClient(tokenProvider, { timeoutMs: 25_000 }),
              dataDir: cfg.dataDir,
              bootstrap: true,
            });
            console.info(
              JSON.stringify({
                level: 'info',
                msg: 'fabric_bootstrap_complete',
                indexed: result.indexed,
                attempt,
              }),
            );
            return;
          } catch (err) {
            lastErr = err;
            console.error(
              JSON.stringify({
                level: 'error',
                msg: 'fabric_bootstrap_retry',
                attempt,
                detail: String(err),
              }),
            );
            await new Promise((resolve) => setTimeout(resolve, 8_000));
          }
        }
        console.error(JSON.stringify({ level: 'error', msg: 'fabric_bootstrap_failed', detail: String(lastErr) }));
      };
      setTimeout(() => {
        void run();
      }, 20_000);
    }
  });

  return server;
}

startServer();
