#version 300 es

// Metaballs, filled where F > T.

precision highp float;

uniform vec2 size;
uniform vec3 balls[8];
uniform int count;
uniform float lambda;
uniform float threshold;
uniform vec3 insideColor;
uniform vec3 outsideColor;

in vec2 uv;

out vec4 fragColor;

// F at the position p.
float field(vec2 p) {
    // TODO: implement your code here.
    return 0.0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(outsideColor, 1.0);
}
