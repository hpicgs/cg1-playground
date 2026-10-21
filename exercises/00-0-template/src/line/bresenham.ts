export type Pixel = [number, number];

// Bresenham's algorithm: the pixels of the line from (x0, y0) to (x1, y1), in all directions.
export function rasterizeLine(x0: number, y0: number, x1: number, y1: number): Pixel[] {
    const pixels: Pixel[] = [];
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const stepX = x0 < x1 ? 1 : -1;
    const stepY = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    let x = x0;
    let y = y0;

    for (;;) {
        pixels.push([x, y]);
        if (x === x1 && y === y1) {
            break;
        }
        const doubled = 2 * error;
        if (doubled >= dy) {
            error += dy;
            x += stepX;
        }
        if (doubled <= dx) {
            error += dx;
            y += stepY;
        }
    }
    return pixels;
}
