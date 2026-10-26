#version 300 es

// One ball, filled where f > T.

precision highp float;

uniform vec2 size;
uniform vec3 ball;
uniform float lambda;
uniform float threshold;
uniform vec3 insideColor;
uniform vec3 outsideColor;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = vec4(outsideColor, 1.0);
}
