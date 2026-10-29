#version 300 es

// Writes the BT.709 gray value of the input image.

precision highp float;

uniform sampler2D image;
uniform vec2 size;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = texture(image, uv);
}
