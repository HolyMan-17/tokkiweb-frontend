import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Guardián: garantiza que los artefactos de Vercel no regresen al repo tras la
// migración a Coolify/Docker (server/og-server.mjs). Creado ANTES de eliminar
// los artefactos (TDD: rojo → verde). Plan: .omo/plans/remove-vercel-artifacts.md

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'),
) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('sin dependencias @vercel', () => {
  it('no tiene paquetes @vercel en dependencies', () => {
    const hits = Object.keys(pkg.dependencies ?? {}).filter(k =>
      k.startsWith('@vercel'),
    );
    expect(hits).toEqual([]);
  });

  it('no tiene paquetes @vercel en devDependencies', () => {
    const hits = Object.keys(pkg.devDependencies ?? {}).filter(k =>
      k.startsWith('@vercel'),
    );
    expect(hits).toEqual([]);
  });
});

describe('sin imports @vercel en main.tsx', () => {
  it('el código fuente de main.tsx no referencia @vercel', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
    expect(source.includes('@vercel')).toBe(false);
  });
});

describe('archivos Vercel eliminados', () => {
  const deletedPaths = [
    'vercel.json',
    '.vercelignore',
    'api/og-product.ts',
    'src/utils/ogProduct.ts',
    'src/test/vercelJson.test.ts',
    'src/test/ogProductApi.test.ts',
    'src/utils/ogProduct.test.ts',
  ];

  it('ningún artefacto de Vercel queda en el repo', () => {
    for (const rel of deletedPaths) {
      expect(existsSync(resolve(process.cwd(), rel)), `aún existe: ${rel}`).toBe(
        false,
      );
    }
  });
});

describe('pipeline de embeds intacto', () => {
  it('los archivos del servidor de embeds (og-server) siguen presentes', () => {
    expect(existsSync(resolve(process.cwd(), 'server/og-server.mjs'))).toBe(
      true,
    );
    expect(existsSync(resolve(process.cwd(), 'src/test/ogServer.test.ts'))).toBe(
      true,
    );
    expect(existsSync(resolve(process.cwd(), 'Dockerfile'))).toBe(true);
  });
});
