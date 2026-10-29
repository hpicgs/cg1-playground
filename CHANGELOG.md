# Changelog

Every change to a released exercise is listed here, with a note on how to get it with `git pull`.

## 2026-10-28

- Exercise sheet 1 for Kapitel 2 on the `exercise-01` branch: `02-1-dithering`, `02-2-image-filters`, `02-3-metaballs` and `02-4-mandelbrot`.
- A summary box can hold a text field (`\textfield{summary.md}`). Save writes its text into `summary.md` in the exercise folder, and a change to that file in the IDE shows up in the field. Every exercise with such a field contains an empty `summary.md`.
- Subtasks in a task are lettered a), b), c). The self-test marks partly right answers.
- After a shader error the demo keeps its height, so the editor stays usable.
- Each exercise can be started on its own from its folder; the README describes how.

## 2026-10-21

- The prototype is merged into `main` as the framework for all exercises.

## 2026-10-16

- Repository setup: npm workspaces, TypeScript, ESLint, Prettier, the Vite dev server with a plugin skeleton, and `npm run check`.
- Prototype on the `prototype` branch: template exercise `00-0-template`, landing page, shader editor with save endpoint, and the READMEs.
