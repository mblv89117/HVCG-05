import { createServer } from 'node:http';
import { loadConfig } from './config.ts';
import { buildRegistry } from './connectors/registry.ts';
import { handleRequest } from './http/router.ts';
import { loadSecretsFile } from './loadSecrets.ts';
import { createLocalAiService } from './local-ai/service.ts';
import { PmRepository } from './pm/repository.ts';
import { IntegrationRepository } from './store/repository.ts';
import { join } from 'node:path';

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
  const pm = new PmRepository(cfg.dataDir);
  const localAi = createLocalAiService(join(cfg.dataDir, 'local-ai'));
  void localAi.refreshOllamaDiscovery(true).catch((err) => {
    console.warn(
      JSON.stringify({
        level: 'warn',
        msg: 'ollama discovery failed at startup',
        detail: String(err),
      }),
    );
  });
  const app = buildRegistry(cfg, repo);

  const server = createServer((req, res) => {
    handleRequest({ cfg, repo, app, pm, localAi }, req, res).catch((err) => {
      console.error(JSON.stringify({ level: 'error', msg: 'unhandled', detail: String(err) }));
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'server_error' }));
    });
  });

  // Bind all local interfaces so both localhost and 127.0.0.1 work
  // (Elite OS often loads on 127.0.0.1; Entra OAuth redirects use localhost).
  server.listen(cfg.port, '0.0.0.0', () => {
    console.info(
      JSON.stringify({
        level: 'info',
        msg: 'atlas-integration-api listening',
        port: cfg.port,
        host: '0.0.0.0',
        dataDir: cfg.dataDir,
        microsoftConfigured: Boolean(cfg.microsoft.clientId && cfg.microsoft.clientSecret),
      }),
    );
  });

  return server;
}

startServer();
