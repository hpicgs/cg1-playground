#version 300 es

// The body's colour, with rings around its long axis so that a rotation is visible, and a
// fixed brightness per face so that the faces can be told apart.

precision highp float;

in vec3 v_local;
in vec3 v_normal;

uniform vec3 u_color;
uniform float u_stripes;

out vec4 fragColor;

void main() {
    float stripe = step(0.5, fract(v_local.x * u_stripes));
    vec3 color = mix(u_color, u_color * 0.6, stripe);
    float brightness = 0.55 + 0.45 * abs(dot(normalize(v_normal), normalize(vec3(0.4, 0.3, 1.0))));
    fragColor = vec4(color * brightness, 1.0);
}
