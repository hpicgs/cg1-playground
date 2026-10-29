# cg1-playground

Exercises for the lecture 3D-Computergrafik I at HPI, winter semester 2026/27.

Each exercise is a web page with text, formulas, interactive demos and tasks. The pages run locally on your machine in a small development server.

## Setup

You need Node.js 24 or newer (with npm) and git.

On Linux, install both with your distribution's package manager. If it only offers an older Node.js, use the installer from [nodejs.org](https://nodejs.org/) or [nvm](https://github.com/nvm-sh/nvm). On Windows, use the installers from [nodejs.org](https://nodejs.org/) and [git-scm.com](https://git-scm.com/). On macOS, use the same installers or Homebrew: `brew install node git`.

Then check in a terminal that both are there:

```sh
node --version
git --version
```

Clone the repository and install the packages. One `npm install` in the root folder covers all exercises.

```sh
git clone https://github.com/hpicgs/cg1-playground.git
cd cg1-playground
npm install
```

## Running

```sh
npm run dev
```

Then open the address shown in the terminal, usually http://localhost:5173/. It shows the landing page with all exercises by chapter. If the port is taken, the server uses the next free one (5174 and so on). Stop it with Ctrl+C.

Each exercise can also be started on its own, for example from a zip downloaded from Moodle. It does not need the rest of this repository: neither the root folder, nor the landing page, nor the root `npm install`. In the exercise's folder, run:

```sh
npm install
npm run dev
```

The address shown in the terminal then opens that exercise directly.

The demos need WebGL 2. [get.webgl.org/webgl2](https://get.webgl.org/webgl2/) shows whether your browser supports it. Firefox and Chrome on Linux, Windows and macOS are supported.

What you change in your IDE shows up on the page right away. If you change a shader (`.vert` or `.frag`), only the demo that uses it is recompiled. If you change a `.ts` file, the whole page reloads and all controls are reset.

## Getting new exercises and fixes

New exercises are added every two weeks. Get them with:

```sh
git pull
npm install
```

Released exercises only change for real bugs. Every fix is listed in [CHANGELOG.md](CHANGELOG.md). Since you work in the exercise files, `git pull` can conflict with your changes. In that case, put them aside with `git stash` before pulling and bring them back with `git stash pop`, or keep them in a commit of your own.

## Repository structure

Each exercise lives in its own folder under `exercises/` and runs on its own, also without the rest of the repository. There is no shared code; every exercise has its own copy of everything it needs. How an exercise is built is described in its own README.

Folders are named `<chapter>-<n>-<slug>`, for example `02-1-dithering`: chapter 2 of the lecture, first exercise on it. The name gives the chapter, the order and the address on the landing page. The package name in an exercise's `package.json` equals its folder name.

The landing page reads each exercise's `meta.json`. It holds only a title and a short description:

```json
{
    "title": "Dithering",
    "description": "Graustufen nur mit Schwarz und Weiß darstellen."
}
```

Folders starting with `00-` are not listed on the landing page. This is the template `00-0-template`, which every new exercise starts as a copy of. It is at http://localhost:5173/exercises/00-0-template/. A folder whose name does not follow the pattern is shown as an error on the landing page.

The root folder holds the landing page (`index.html`, `index.ts`) and, in `config/`, the settings for the server, TypeScript, ESLint and Prettier. The root server serves the landing page and all exercises. For that, `config/` has its own copy of the exercises' server-side files (`plugin.ts`, `markdown.ts`, `vite.config.ts`). These copies must match the ones in the exercises.

## Checks before a pull request

There is no CI. Before every pull request, run in the root folder:

```sh
npm run check
```

It runs these steps in order and stops at the first error:

- `npm run check:repo`: the shared files are identical in all exercises, and the server-side ones also with the root. Every package has the same version in all `package.json` files. Folder and package names are correct.
- `npm run typecheck`: TypeScript in the root and in every exercise.
- `npm run lint`: ESLint.
- `npm run pretty:check`: Prettier, without changing anything. `npm run pretty` formats all files; `content.md` is skipped, because Prettier would break its formulas.

If a shared file changes, the change goes into every exercise and, for the server-side files, into the root as well. Versions are pinned exactly in every `package.json`.
