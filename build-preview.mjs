// Builds a single self-contained HTML file (no service worker) for the online preview.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const dir = 'dist-preview/assets'
const files = readdirSync(dir)
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith('.js'))}`, 'utf8').replaceAll('</script', '<\\/script')
const css = readFileSync(`${dir}/${files.find((f) => f.endsWith('.css'))}`, 'utf8')
const icon = 'data:image/svg+xml;base64,' + readFileSync('public/icon.svg').toString('base64')
const html = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Life Stats</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Archivo+Black&family=JetBrains+Mono:wght@500;600&display=swap">
<link rel="icon" href="${icon}">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`
writeFileSync('dist-preview/life-app.html', html)
console.log('ok', (html.length / 1024).toFixed(0) + ' KB')
