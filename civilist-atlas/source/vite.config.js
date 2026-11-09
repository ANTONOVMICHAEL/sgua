import {defineConfig} from 'vite';
import {viteSingleFile} from 'vite-plugin-singlefile';

export default defineConfig(({mode})=>({
  base: './',
  publicDir: 'public',
  server: {allowedHosts:['terminal.local']},
  plugins: mode==='offline' ? [viteSingleFile()] : [],
  build: {
    assetsInlineLimit: mode==='offline' ? 20000000 : 4096,
    cssCodeSplit: false,
    rollupOptions: {output: {manualChunks: undefined}}
  }
}));
