// The geometry of the aircraft that the demos of this page draw, built in its own local
// coordinate system: the nose points along x, the wings lie along y, and z points up.

export type Geometry = {
    positions: number[];
    normals: number[];
    indices: number[];
};

/**
 * A box with the given size, centred at centre.
 *
 * @param size - The extent along x, y and z.
 */
export function box(size: number[], centre: number[]): Geometry {
    const half = [size[0] / 2, size[1] / 2, size[2] / 2];
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];

    // Each face is described by the axis it faces and the two axes that span it.
    const faces = [
        [0, 1, 2],
        [1, 2, 0],
        [2, 0, 1],
    ];
    const corners = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
    ];
    for (const [facing, first, second] of faces) {
        for (const side of [1, -1]) {
            const start = positions.length / 3;
            for (const [u, v] of corners) {
                const corner = [0, 0, 0];
                corner[facing] = side * half[facing];
                corner[first] = u * half[first];
                corner[second] = v * half[second];
                positions.push(centre[0] + corner[0], centre[1] + corner[1], centre[2] + corner[2]);
                const normal = [0, 0, 0];
                normal[facing] = side;
                normals.push(normal[0], normal[1], normal[2]);
            }
            indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
        }
    }
    return { positions, normals, indices };
}

/** The four parts of the aircraft, each with its own colour. */
export const fuselage = box([1.7, 0.22, 0.24], [0, 0, 0]);
export const leftWing = box([0.45, 0.85, 0.06], [-0.05, 0.55, 0]);
export const rightWing = box([0.45, 0.85, 0.06], [-0.05, -0.55, 0]);
export const fin = box([0.35, 0.05, 0.42], [-0.68, 0, 0.28]);

export const fuselageColor = [0.62, 0.66, 0.74];
export const leftWingColor = [0.4, 0.66, 0.47];
export const rightWingColor = [0.85, 0.43, 0.36];
export const finColor = [0.89, 0.71, 0.33];

// Rings around the fuselage, so that a roll about its long axis is visible.
export const fuselageStripes = 3;
