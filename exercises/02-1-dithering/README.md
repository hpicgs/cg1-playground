# Übung

Diese README beschreibt, wie eine Übung aufgebaut ist und wie du sie startest. Sie ist in jeder Übung gleich; die Vorlage `00-0-template` ist das Original.

## Allein starten

Eine Übung läuft auch ohne den Rest des Repositorys, zum Beispiel aus einem Zip von Moodle. Du brauchst Node.js ab Version 24. Im Ordner der Übung:

```sh
npm install
npm run dev
```

Öffne danach die Adresse, die im Terminal steht, meist http://localhost:5173/.

Was du in der IDE änderst, siehst du sofort auf der Seite:

- Ein Shader (`.vert`, `.frag`): Nur die Demo, die ihn benutzt, wird neu kompiliert. Die Seite bleibt, wie sie ist.
- `config/style.css`: Das Aussehen ändert sich sofort, ohne Neuladen.
- Eine `.ts`-Datei in `src/` oder `config/`, `content.md`, `meta.json` oder `config/macros.json`: Die Seite lädt neu, alle Regler stehen wieder am Anfang.
- `config/plugin.ts`, `config/markdown.ts` oder `config/vite.config.ts`: Der Server startet von selbst neu.

## Aufbau

```
index.html      Rahmen der Seite
content.md      Text, Aufgaben und Platzhalter für die Demos
meta.json       Titel und Kurzbeschreibung für die Startseite
assets/         Bilder, auch Beispielbilder zu Lösungen
src/            Code der Demos
config/         Server, Seite, Editor und Einstellungen
```

In `src/` hat jede Demo einen eigenen Ordner:

```
src/example/
  index.ts      Regler und Ablauf der Demo
  renderer.ts   alle WebGL-Aufrufe der Demo
  quad.vert     Vertex-Shader
  quad.frag     Fragment-Shader
```

Braucht eine Aufgabe Code auf der CPU, kommt er in eine eigene Datei, wie `src/line/example.ts`.

In `config/` liegen `plugin.ts` (der Server: rendert `content.md`, speichert Shader aus dem Editor), `markdown.ts` (Markdown, Formeln und die Befehle im LaTeX-Stil), `page.ts` (startet die Demos im Browser), `editor.ts` (Shader-Editor und Code-Listings), `stepper.ts` (Schritt-für-Schritt-Ansichten), `style.css` (Aussehen), `macros.json` (Formel-Makros) und die Einstellungen für TypeScript, ESLint und Prettier. Die Dateien `tsconfig.json`, `eslint.config.js` und `.prettierignore` im Ordner der Übung verweisen nur nach `config/`, damit deine IDE sie findet.

## Eine neue Übung anlegen

Kopiere `exercises/00-0-template` und benenne den Ordner nach dem Schema `<Kapitel>-<Nummer>-<Kurzname>`. Setze in der `package.json` denselben Namen, passe `meta.json` an und schreibe `content.md` und `src/` neu. Danach im Hauptordner `npm install` und `npm run check`.
