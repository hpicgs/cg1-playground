#version 300 es

// Metaballs in your own colours.

precision highp float;

uniform vec2 size;
uniform vec3 balls[8];
uniform int count;
uniform float lambda;
uniform float threshold;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;

in vec2 uv;

out vec4 fragColor;

// F at the position p.
float field(vec2 p) {
    // TODO: implement your code here.
    return 0.0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(color1, 1.0);
}
