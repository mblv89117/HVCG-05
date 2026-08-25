import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import type { AppConfig } from '../config.ts';
import { APPROVED_PLAID_PRODUCTS } from '../../../../packages/atlas-plaid-contracts/src/index.ts';

export function createPlaidClient(cfg: AppConfig): PlaidApi {
  const env =
    cfg.plaidEnv === 'production'
      ? PlaidEnvironments.production
      : cfg.plaidEnv === 'development'
        ? PlaidEnvironments.development
        : PlaidEnvironments.sandbox;

  const configuration = new Configuration({
    basePath: env,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': cfg.plaidClientId,
        'PLAID-SECRET': cfg.plaidSecret,
      },
    },
  });
  return new PlaidApi(configuration);
}

export function approvedProductsEnum(): Products[] {
  const map: Record<string, Products> = {
    auth: Products.Auth,
    balance: Products.Balance,
    identity: Products.Identity,
    liabilities: Products.Liabilities,
    statements: Products.Statements,
    transactions: Products.Transactions,
  };
  return APPROVED_PLAID_PRODUCTS.map((p) => map[p]).filter(Boolean);
}

export const PLAID_COUNTRY = [CountryCode.Us];
