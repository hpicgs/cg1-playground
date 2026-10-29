// Returns a new image with inverted colours: every R, G and B byte c becomes 255 - c.
// Alpha is copied.
// TODO: task "Bytes schreiben"
export function invert(image: ImageData): ImageData {
    const output = new ImageData(image.width, image.height);
    for (let j = 0; j < image.height; j++) {
        for (let i = 0; i < image.width; i++) {
            const index = 4 * (j * image.width + i);
            output.data[index] = 255 - image.data[index];
            output.data[index + 1] = 255 - image.data[index + 1];
            output.data[index + 2] = 255 - image.data[index + 2];
            output.data[index + 3] = image.data[index + 3];
        }
    }
    return output;
}
