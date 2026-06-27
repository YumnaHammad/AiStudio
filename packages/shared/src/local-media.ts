import fs from 'fs';
import path from 'path';

let cachedMonorepoRoot: string | null = null;

/** Walk up from this package to find the monorepo root (ai-content-studio). */
export function resolveMonorepoRoot(): string {
  if (cachedMonorepoRoot) return cachedMonorepoRoot;

  let dir = __dirname;
  for (let depth = 0; depth < 12; depth++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
          name?: string;
          workspaces?: unknown;
        };
        if (pkg.name === 'ai-content-studio' && Array.isArray(pkg.workspaces)) {
          cachedMonorepoRoot = dir;
          return dir;
        }
      } catch {
        // keep walking
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  cachedMonorepoRoot = process.cwd();
  return cachedMonorepoRoot;
}

function resolveMediaDir(configured: string | undefined): string {
  if (!configured) {
    return path.join(resolveMonorepoRoot(), 'data', 'media');
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }
  return path.join(resolveMonorepoRoot(), configured);
}

/** Root folder for dev media when Cloudflare R2 is not configured */
export function getLocalMediaRoot(): string {
  const root = resolveMediaDir(process.env.LOCAL_MEDIA_DIR);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

export function resolveLocalMediaPath(relativePath: string): string {
  return path.join(getLocalMediaRoot(), relativePath.replace(/\\/g, '/'));
}

export function saveLocalMedia(relativePath: string, data: Buffer): string {
  const fullPath = resolveLocalMediaPath(relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, data);
  return fullPath;
}

export function localMediaExists(relativePath: string): boolean {
  return fs.existsSync(resolveLocalMediaPath(relativePath));
}
