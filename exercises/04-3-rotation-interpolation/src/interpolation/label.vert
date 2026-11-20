#version 300 es

// One corner of a label's quad. The quad is spanned by the camera's right and up vectors, so
// that the text always faces the viewer.

in vec2 a_corner;

uniform vec3 u_center;
uniform vec3 u_right;
uniform vec3 u_up;
uniform vec2 u_size;
uniform mat4 u_viewProjection;

out vec2 v_uv;

void main() {
    v_uv = a_corner * vec2(0.5, -0.5) + 0.5;
    vec3 world = u_center + u_right * (a_corner.x * u_size.x) + u_up * (a_corner.y * u_size.y);
    gl_Position = u_viewProjection * vec4(world, 1.0);
}
