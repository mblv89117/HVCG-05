/**
 * Optional Local AI capability — governance, prompt contract, and provider config.
 * Runtime execution lives behind the Hub adapter and is never a boot dependency.
 */

export * from './ownership.ts';
export * from './featureFlags.ts';
export * from './workValue.ts';
export * from './approvalGates.ts';
export * from './decisionPackage.ts';
export * from './policyEngine.ts';
export * from './allowedOperations.ts';
export * from './redaction.ts';
export * from './injectionDefense.ts';
export * from './ollamaOutput.ts';
export * from './promptContract.ts';
export * from './ollamaConfig.ts';
export * from './phase3Operations.ts';
export * from './timeProtectionOutput.ts';
