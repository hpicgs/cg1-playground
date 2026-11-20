// The geometry of the three bodies, built in their own local coordinate system.

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

/** Puts two geometries into one, so that a body can be built from several parts. */
export function merge(first: Geometry, second: Geometry): Geometry {
    const offset = first.positions.length / 3;
    return {
        positions: [...first.positions, ...second.positions],
        normals: [...first.normals, ...second.normals],
        indices: [...first.indices, ...second.indices.map((index) => index + offset)],
    };
}

/** A cylinder along the z axis, centred at the origin. */
export function cylinder(radius: number, height: number, segments: number): Geometry {
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const top = height / 2;
    const bottom = -height / 2;

    // The side, as a ring of quads between the lower and the upper circle.
    for (let i = 0; i <= segments; i++) {
        const angle = (2 * Math.PI * i) / segments;
        const x = Math.cos(angle);
        const y = Math.sin(angle);
        positions.push(radius * x, radius * y, bottom, radius * x, radius * y, top);
        normals.push(x, y, 0, x, y, 0);
    }
    for (let i = 0; i < segments; i++) {
        const corner = 2 * i;
        indices.push(corner, corner + 1, corner + 2, corner + 1, corner + 3, corner + 2);
    }

    // The two caps, each as a fan around its centre.
    for (const [z, facing] of [
        [bottom, -1],
        [top, 1],
    ]) {
        const centre = positions.length / 3;
        positions.push(0, 0, z);
        normals.push(0, 0, facing);
        for (let i = 0; i <= segments; i++) {
            const angle = (2 * Math.PI * i) / segments;
            positions.push(radius * Math.cos(angle), radius * Math.sin(angle), z);
            normals.push(0, 0, facing);
        }
        for (let i = 0; i < segments; i++) {
            indices.push(centre, centre + 1 + i, centre + 2 + i);
        }
    }
    return { positions, normals, indices };
}
