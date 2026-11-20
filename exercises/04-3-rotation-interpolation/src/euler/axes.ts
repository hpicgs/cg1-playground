// The three world axes as line segments.

import type { Geometry } from "./plane";

/** The three axes from the origin to the given length, as lines. */
export function axes(length: number): Geometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    for (let axis = 0; axis < 3; axis++) {
        const tip = [0, 0, 0];
        tip[axis] = length;
        const start = positions.length / 3;
        positions.push(0, 0, 0, tip[0], tip[1], tip[2]);
        normals.push(0, 0, 1, 0, 0, 1);
        indices.push(start, start + 1);
    }
    return { positions, normals, indices };
}
