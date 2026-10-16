import type { Pixel } from "./bresenham";

export type LineScene = {
    columns: number;
    rows: number;
    lineStart: Pixel;
    lineEnd: Pixel;
    pixels: Pixel[];
    color: string;
};

// Draws the grid, the set pixels, the exact line and its two endpoints, in CSS pixels.
export function draw(context: CanvasRenderingContext2D, scene: LineScene): void {
    const width = context.canvas.clientWidth;
    const height = context.canvas.clientHeight;
    const cell = width / scene.columns;

    // Background.
    context.fillStyle = "#15171c";
    context.fillRect(0, 0, width, height);

    // Set pixels.
    context.fillStyle = scene.color;
    for (const [x, y] of scene.pixels) {
        context.fillRect(x * cell, y * cell, cell, cell);
    }

    // Grid lines.
    context.strokeStyle = "#2e333d";
    context.lineWidth = 1;
    context.beginPath();
    for (let x = 0; x <= scene.columns; x++) {
        context.moveTo(x * cell, 0);
        context.lineTo(x * cell, height);
    }
    for (let y = 0; y <= scene.rows; y++) {
        context.moveTo(0, y * cell);
        context.lineTo(width, y * cell);
    }
    context.stroke();

    // The exact line between the centres of the two endpoint cells.
    const startX = (scene.lineStart[0] + 0.5) * cell;
    const startY = (scene.lineStart[1] + 0.5) * cell;
    const endX = (scene.lineEnd[0] + 0.5) * cell;
    const endY = (scene.lineEnd[1] + 0.5) * cell;
    context.strokeStyle = "#d9dce2";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    // Handles to drag the endpoints.
    const radius = Math.max(5, cell * 0.3);
    context.fillStyle = "#d9dce2";
    context.beginPath();
    context.arc(startX, startY, radius, 0, 2 * Math.PI);
    context.fill();
    context.beginPath();
    context.arc(endX, endY, radius, 0, 2 * Math.PI);
    context.fill();
}
