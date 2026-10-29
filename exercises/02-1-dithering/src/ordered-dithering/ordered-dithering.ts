// Returns a new array with 1 where the gray value is greater than the threshold map at that
// pixel and 0 elsewhere. The n × n map is repeated over the whole image.
export function orderedDithering(
    gray: Float32Array,
    width: number,
    height: number,
    map: number[][],
): Float32Array {
    // TODO: implement your code here.
    return gray;
}

// Returns the Bayer matrix M_n with values in [0, 1), for n a power of 2.
export function bayerMatrix(n: number): number[][] {
    // TODO: implement your code here.
    return [[0.5]];
}
