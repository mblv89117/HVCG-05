import type { AppConfig } from '../config.ts';
import type { IntegrationRepository } from '../store/repository.ts';

export interface AdapterDeps {
  config: AppConfig;
  repo: IntegrationRepository;
}

export function tokenExpiresAt(expiresInSeconds: number): string {
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}
