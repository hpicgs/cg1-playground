// Laplace filter with the 4-neighbour mask (Kapitel 2, Laplace-Filter): R, G and B of every pixel
// become beta + alpha · L, with values in [0, 1]. Pixels outside the image are replaced by the
// nearest pixel inside. Alpha is copied.
export function laplace(image: ImageData, alpha: number, beta: number): ImageData {
    // TODO: implement your code here.
    return image;
}
