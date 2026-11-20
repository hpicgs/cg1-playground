#version 300 es

// One vertex of a body in its local coordinates. u_model holds the body's transformation,
// u_viewProjection the camera and the projection.

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_viewProjection;

out vec3 v_local;
out vec3 v_normal;

void main() {
    v_local = a_position;
    v_normal = mat3(u_model) * a_normal;
    gl_Position = u_viewProjection * u_model * vec4(a_position, 1.0);
}
