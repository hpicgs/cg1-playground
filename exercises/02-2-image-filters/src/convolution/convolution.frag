#version 300 es

// Your own convolution.

precision highp float;

uniform sampler2D image;
uniform vec2 size;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
