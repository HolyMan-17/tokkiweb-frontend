import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

function debugBundle(): Plugin {
  return {
    name: 'debug-bundle',
    apply: 'build',
    generateBundle(_o, bundle) {
      const entries = Object.entries(bundle).map(([k, v]) => `${k} -> ${v.type}`)
      console.log('BUNDLE KEYS:\n' + entries.join('\n'))
    },
  }
}

export default defineConfig({
  plugins: [react(), debugBundle()],
})
