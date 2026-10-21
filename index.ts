import "./config/landing.css";
import chapters from "./config/chapters.json";

/** Chapter titles of the lecture, by chapter number. */
const chapterTitles: Record<string, string> = chapters;

/** Contents of an exercise's `meta.json`. */
type Meta = { title: string; description: string };

/** Exercise folder names: `<chapter>-<n>-<slug>`. */
const exerciseName = /^(\d{2})-\d+-[a-z0-9]+(-[a-z0-9]+)*$/;

// Every exercise's meta.json, keyed by path, e.g. ./exercises/02-1-dithering/meta.json.
const metas = import.meta.glob<Meta>("./exercises/*/meta.json", { eager: true, import: "default" });

const main = document.querySelector("main");
const byChapter = new Map<number, { name: string; meta: Meta }[]>();
const invalid: string[] = [];

// Sort by folder name; hide folders starting with 00-; collect wrongly named folders.
for (const [path, meta] of Object.entries(metas).sort(([a], [b]) => a.localeCompare(b))) {
    const name = path.split("/")[2];
    const match = exerciseName.exec(name);
    if (match === null) {
        invalid.push(name);
        continue;
    }
    const chapter = Number(match[1]);
    if (chapter === 0) {
        continue;
    }
    byChapter.set(chapter, [...(byChapter.get(chapter) ?? []), { name, meta }]);
}

for (const name of invalid) {
    const error = document.createElement("p");
    error.className = "error";
    error.textContent = `Der Ordner exercises/${name} heißt nicht <Kapitel>-<Nummer>-<Kurzname> und wird nicht angezeigt.`;
    main?.append(error);
}

if (byChapter.size === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Noch keine Übungen veröffentlicht.";
    main?.append(empty);
}

// One section per chapter, one card per exercise.
for (const chapter of [...byChapter.keys()].sort((a, b) => a - b)) {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = `Kapitel ${chapter}: ${chapterTitles[chapter] ?? ""}`;
    section.append(heading);
    for (const { name, meta } of byChapter.get(chapter) ?? []) {
        const card = document.createElement("a");
        card.className = "exercise";
        card.href = `./exercises/${name}/`;
        const title = document.createElement("strong");
        title.textContent = meta.title;
        const description = document.createElement("span");
        description.textContent = meta.description;
        card.append(title, description);
        section.append(card);
    }
    main?.append(section);
}
