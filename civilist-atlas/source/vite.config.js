import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig(({mode})=>({base:mode==='offline'?'./':'/sgua/civilist-atlas/',plugins:mode==='offline'?[viteSingleFile()]:[],build:{outDir:mode==='offline'?'offline':'dist',assetsInlineLimit:mode==='offline'?100000000:4096,rollupOptions:mode==='offline'?{output:{inlineDynamicImports:true}}:{}}}));
