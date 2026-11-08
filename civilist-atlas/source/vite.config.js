import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
export default defineConfig(({mode,command})=>({base:command==='serve'?'/':mode==='offline'?'./':'/sgua/civilist-atlas/',server:{allowedHosts:['terminal.local']},plugins:mode==='offline'?[viteSingleFile()]:[],build:{outDir:mode==='offline'?'offline':'dist',assetsInlineLimit:mode==='offline'?100000000:4096,rollupOptions:mode==='offline'?{output:{inlineDynamicImports:true}}:{}}}));

