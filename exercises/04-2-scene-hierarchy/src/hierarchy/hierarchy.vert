#version 300 es

// One vertex in the local coordinates of its node. u_stack holds the local transformations
// from the root down to this node, u_depth says how many of them belong to it, and
// u_viewProjection holds the camera and the projection.

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_stack[3];
uniform int u_depth;
uniform mat4 u_viewProjection;

out vec3 v_local;
out vec3 v_normal;

void main() {
    v_local = a_position;
    v_normal = a_normal;

    // TODO: task "Die Gesamttransformation im Shader"
    mat4 model = mat4(1.0);

    gl_Position = u_viewProjection * model * vec4(a_position, 1.0);
}
