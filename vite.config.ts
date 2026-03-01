import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'fs';
import { join } from 'path';

// GitHub Pages: serve app for all paths so /upload, /admin etc. work (SPA fallback)
function copyIndexTo404() {
  return {
    name: 'copy-index-to-404',
    closeBundle() {
      const outDir = join(process.cwd(), 'docs');
      const index = join(outDir, 'index.html');
      const fallback = join(outDir, '404.html');
      if (existsSync(index)) {
        copyFileSync(index, fallback);
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), copyIndexTo404()],
  build: {
    outDir: 'docs',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
