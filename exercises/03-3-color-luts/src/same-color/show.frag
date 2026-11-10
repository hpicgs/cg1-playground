#version 300 es

// Shows an image enlarged. While a colour is highlighted, every pixel whose input colour is a
// different one is drawn darker.

precision highp float;

uniform sampler2D shown;
uniform sampler2D inputImage;
uniform bool highlighting;
uniform vec3 highlight;

in vec2 uv;

out vec4 fragColor;

void main() {
    vec3 color = texture(shown, uv).rgb;
    vec3 inputColor = textureLod(inputImage, uv, 0.0).rgb;
    if (highlighting && any(greaterThan(abs(inputColor - highlight), vec3(0.5 / 255.0)))) {
        color *= 0.2;
    }
    fragColor = vec4(color, 1.0);
}
