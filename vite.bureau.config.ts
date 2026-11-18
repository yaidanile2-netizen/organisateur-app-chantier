// Version « HTML du Bureau » (19/11/2026) : toute l'app dans un seul fichier, à ouvrir sans internet installé
// (il faut quand même internet pour l'agenda et l'IA). Pas de service worker ni de notifications.
// Construire : npm i --no-save vite-plugin-singlefile@2 puis npx vite build --config vite.bureau.config.ts  →  dist-bureau/index.html
// (copié sur le Bureau du PC sous « Organisateur.html »).
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

const icone = `data:image/svg+xml;base64,${readFileSync('public/favicon.svg').toString('base64')}`
const iconeBureau: Plugin = {
    name: 'icone-bureau',
    transformIndexHtml: (html) =>
        html.replace('href="/favicon.svg"', `href="${icone}"`).replace(/\s*<link rel="apple-touch-icon"[^>]*>/, ''),
}

export default defineConfig({
    plugins: [react(), viteSingleFile(), iconeBureau],
    define: { 'import.meta.env.VITE_BUREAU': JSON.stringify('1') },
    publicDir: false,
    build: { outDir: 'dist-bureau', emptyOutDir: true, assetsInlineLimit: 100000000, chunkSizeWarningLimit: 5000 },
})
