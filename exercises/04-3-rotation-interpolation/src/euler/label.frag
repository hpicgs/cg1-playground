#version 300 es

// The label's text, taken from the alpha channel of its texture.

precision highp float;

in vec2 v_uv;

uniform sampler2D u_text;
uniform vec3 u_color;

out vec4 fragColor;

void main() {
    float mask = texture(u_text, v_uv).a;
    if (mask < 0.02) {
        discard;
    }
    fragColor = vec4(u_color * mask, mask);
}
