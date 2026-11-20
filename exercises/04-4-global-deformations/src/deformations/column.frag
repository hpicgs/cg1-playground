#version 300 es

// The column's colour: stripes along the axis and rings around it, both taken from the
// undeformed position, so that a twist and a bend are visible. The normal comes from the
// deformed position of the neighbouring fragments, which makes a coarse tessellation show up
// as flat facets.

precision highp float;

in vec3 v_rest;
in vec3 v_world;

uniform float u_stripes;
uniform bool u_edges;

out vec4 fragColor;

const vec3 base = vec3(0.56, 0.62, 0.74);
const vec3 accent = vec3(0.85, 0.52, 0.33);
const vec3 edgeColor = vec3(0.1, 0.11, 0.14);
const vec3 light = vec3(0.4, 0.5, 0.9);

void main() {
    if (u_edges) {
        fragColor = vec4(edgeColor, 1.0);
        return;
    }

    // Sectors around the axis, so that the stripes run along it. u_stripes is how many of them
    // go once around the body.
    float sector = atan(v_rest.y, v_rest.x) / 6.2831853 * u_stripes * 0.5;
    vec3 color = mix(base, accent, step(0.5, fract(sector)));

    // Rings at every half unit of height, placed between the two ends.
    float ring = fract(v_rest.z * 2.0 + 0.5);
    color *= mix(1.0, 0.45, step(min(ring, 1.0 - ring), 0.06));

    vec3 normal = normalize(cross(dFdx(v_world), dFdy(v_world)));
    float brightness = 0.5 + 0.5 * abs(dot(normal, normalize(light)));
    fragColor = vec4(color * brightness, 1.0);
}
