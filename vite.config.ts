import { defineConfig, type Plugin } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

// Inlines the entry stylesheet into the built index.html so the browser gets
// the CSS with the document instead of a separate render-blocking request.
// Lazy-loaded admin CSS chunks are left as files (they only load on demand).
// Also adds <link rel="preload"> for the critical fonts directly in the HTML
// so the browser fetches them at parse time instead of after JS executes.
function inlineEntryCss(): Plugin {
  return {
    name: 'inline-entry-css',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir ?? 'dist'
      const htmlPath = join(outDir, 'index.html')
      if (!existsSync(htmlPath)) return

      let source = readFileSync(htmlPath, 'utf8')

      // 1) Inline the entry stylesheet
      const linkRe = /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g
      let match: RegExpExecArray | null
      while ((match = linkRe.exec(source))) {
        const cssRel = match[1].replace(/^\//, '')
        const cssPath = join(outDir, cssRel)
        if (!existsSync(cssPath)) continue
        const css = readFileSync(cssPath, 'utf8')
        source = source.replace(match[0], `\n<style>\n${css}\n</style>`)
        // Keep the CSS file in dist/assets so Clerk UI and browser chunk preloading find it with text/css MIME type
      }

      // 2) Preload the critical fonts at parse time (matches the weights used
      //    by the hero + body text). Find them by their stable latin names.
      const assetsDir = join(outDir, 'assets')
      const fontTargets = [
        'dynapuff-latin-700-normal',
        'dynapuff-latin-400-normal',
        'sour-gummy-latin-700-normal',
        'sour-gummy-latin-400-normal',
      ]
      const preloads: string[] = []
      if (existsSync(assetsDir)) {
        const files = readdirSync(assetsDir)
        for (const target of fontTargets) {
          const file = files.find(f => f.startsWith(target) && f.endsWith('.woff2'))
          if (file) {
            preloads.push(
              `<link rel="preload" href="/assets/${file}" as="font" type="font/woff2" crossorigin />`,
            )
          }
        }
      }
      if (preloads.length > 0) {
        source = source.replace('</head>', `    ${preloads.join('\n    ')}\n  </head>`)
      }

      writeFileSync(htmlPath, source)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), inlineEntryCss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    // Forks workers time out on some Windows setups; threads are faster to spawn.
    pool: 'threads',
    // Worker spawns on this machine are slow/flaky (Defender scans) — keep
    // them few and sequential so startup stays under Vitest's 60 s timeout.
    fileParallelism: false,
    maxWorkers: 1,
  },
})