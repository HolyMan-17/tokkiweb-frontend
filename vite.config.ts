import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Inlines the entry stylesheet into the built index.html so the browser gets
// the CSS with the document instead of a separate render-blocking request.
// Lazy-loaded admin CSS chunks are left as files (they only load on demand).
function inlineEntryCss(): Plugin {
  return {
    name: 'inline-entry-css',
    apply: 'build',
    generateBundle(_options, bundle) {
      const html = Object.values(bundle).find(
        (a): a is Extract<typeof a, { type: 'asset' }> =>
          a.type === 'asset' && a.fileName.endsWith('.html'),
      )
      if (!html) return

      let source = html.source.toString()
      const linkRe = /<link rel="stylesheet"[^>]*href="([^"]+\.css)"[^>]*>/g
      let match: RegExpExecArray | null
      while ((match = linkRe.exec(source))) {
        const cssFile = match[1].replace(/^\//, '')
        const cssAsset = bundle[cssFile] as
          | { type: 'asset'; source: string | Uint8Array }
          | undefined
        if (!cssAsset || cssAsset.type !== 'asset') continue
        const css =
          typeof cssAsset.source === 'string'
            ? cssAsset.source
            : new TextDecoder().decode(cssAsset.source)
        source = source.replace(match[0], `\n<style>\n${css}\n</style>`)
        delete bundle[cssFile]
      }

      html.source = source
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
  }
})