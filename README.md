# Life/Stats – persönliche Tracking-App

Installierbare Web-App (PWA) für iPhone und Windows. React + TypeScript + Vite.

- `npm install` · `npm run dev` (lokal) · `npm run build` (PWA nach `dist/`)
- Vorschau-Datei als eine HTML: `npx vite build --mode artifact --outDir dist-preview && node build-preview.mjs`

Module: Heute (Übersicht), Körper (Tanita InnerScan Werte + Diagramme), Supplements (eigener Plan, abhaken, Streaks), Profil (Kalorien- und Makroziele), Ernährung (Foto-Erkennung per Gemini mit eigenem kostenlosem Schlüssel, Lebensmittel-Suche mit Grundtabelle in `src/foods.ts` und Open Food Facts, Barcode, eigene Lebensmittel, Wochenübersicht, gesunder Wocheneinkauf).
Daten liegen aktuell lokal im Browser (localStorage); Sync folgt.
