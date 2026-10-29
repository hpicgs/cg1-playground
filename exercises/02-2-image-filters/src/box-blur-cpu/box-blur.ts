// Box filter with radius r: R, G and B of every pixel become the mean of the (2r + 1)² pixels
// around it. Pixels outside the image are replaced by the nearest pixel inside. Alpha is copied.
export function boxBlur(image: ImageData, radius: number): ImageData {
    // TODO: implement your code here.
    return image;
}
