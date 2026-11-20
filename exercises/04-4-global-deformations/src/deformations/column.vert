#version 300 es

// One vertex of the column. a_position is its stored, deformed position, a_rest its place in
// the undeformed body, from which the fragment shader takes the stripes.

in vec3 a_position;
in vec3 a_rest;

uniform mat4 u_viewProjection;

out vec3 v_rest;
out vec3 v_world;

void main() {
    v_rest = a_rest;
    v_world = a_position;
    gl_Position = u_viewProjection * vec4(a_position, 1.0);
}
