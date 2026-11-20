// Text labels in the scene. Each label is drawn once into a 2D canvas and used as a texture on
// a quad that always faces the camera.

/** How many pixels high a label's text is drawn. */
const textHeight = 64;

/** The image of one text, with its width in units of its height. */
export type LabelImage = {
    image: HTMLCanvasElement;
    ratio: number;
};

/** Draws a text into a canvas with a transparent background. */
export function labelImage(text: string): LabelImage {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (context === null) {
        throw new Error("Canvas 2D wird von diesem Browser nicht unterstützt");
    }
    const font = `600 ${textHeight}px system-ui, sans-serif`;
    context.font = font;
    const width = Math.ceil(context.measureText(text).width);
    canvas.width = width;
    canvas.height = Math.ceil(textHeight * 1.4);
    context.font = font;
    context.fillStyle = "#ffffff";
    context.textBaseline = "middle";
    context.fillText(text, 0, canvas.height / 2);
    return { image: canvas, ratio: canvas.width / canvas.height };
}
