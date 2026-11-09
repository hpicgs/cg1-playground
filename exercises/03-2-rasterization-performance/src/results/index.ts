import results from "./results.json";

// One row of the table: a value for each column name.
type Row = Record<string, string | number>;

// Shows the rows of results.json as a table instead of the canvas, one column per key in the
// order of first appearance.
export function start(canvas: HTMLCanvasElement): void {
    const rows = results as Row[];
    const view = document.createElement("div");
    view.className = "results";

    if (rows.length === 0) {
        view.textContent = "Noch keine Messwerte in src/results/results.json.";
        canvas.replaceWith(view);
        return;
    }

    const columns: string[] = [];
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!columns.includes(key)) {
                columns.push(key);
            }
        }
    }

    const table = document.createElement("table");
    const head = table.createTHead().insertRow();
    for (const column of columns) {
        const cell = document.createElement("th");
        cell.textContent = column;
        head.append(cell);
    }
    const body = table.createTBody();
    for (const row of rows) {
        const line = body.insertRow();
        for (const column of columns) {
            const value = row[column];
            line.insertCell().textContent =
                typeof value === "number" ? value.toLocaleString("de-DE") : (value ?? "");
        }
    }
    view.append(table);
    canvas.replaceWith(view);
}
