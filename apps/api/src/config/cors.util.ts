export function resolveCorsOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (fromEnv?.length) return fromEnv;

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  return [appUrl, 'http://localhost:3000'];
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowed = resolveCorsOrigins();
  if (allowed.includes(origin)) return true;
  if (process.env.NODE_ENV !== 'production' && origin.includes('localhost')) return true;
  return false;
}
