import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  base: mode === 'offline' ? './' : '/sgua/civilist-lab-v3/',
  server: { allowedHosts: ['terminal.local'] },
  plugins: mode === 'offline' ? [viteSingleFile()] : [],
  build: {
    assetsInlineLimit: mode === 'offline' ? 100_000_000 : 4096,
    cssCodeSplit: false,
    sourcemap: false,
  },
}));
