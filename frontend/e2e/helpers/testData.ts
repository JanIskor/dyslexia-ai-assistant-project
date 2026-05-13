import type { TestInfo } from '@playwright/test';

export interface UniquePersonName {
  firstName: string;
  lastName: string;
  fullName: string;
}

function randomFragment(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function buildUniqueSuffix(testInfo?: TestInfo, prefix = 'e2e'): string {
  const workerPart = testInfo ? `w${testInfo.workerIndex}` : 'w0';
  return `${prefix}-${Date.now()}-${workerPart}-${randomFragment()}`;
}

export function buildUniqueEmail(prefix: string, suffix: string): string {
  return `${prefix}.${suffix}@example.com`;
}

export function buildUniqueTitle(prefix: string, suffix: string): string {
  return `${prefix} ${suffix}`;
}

export function buildUniquePersonName(
  lastNamePrefix: string,
  firstName: string,
  suffix: string,
): UniquePersonName {
  const lastName = `${lastNamePrefix}${suffix}`;
  return {
    firstName,
    lastName,
    fullName: `${lastName} ${firstName}`,
  };
}
