#version 300 es

// Your own pictures of the Mandelbrot set.

precision highp float;

uniform float xmin;
uniform float xmax;
uniform float ymin;
uniform float ymax;
uniform int maxIterations;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec2 juliaC;
uniform vec2 size;

in vec2 uv;

out vec4 fragColor;

void main() {
    // TODO: implement your code here.
    fragColor = vec4(uv, 0.0, 1.0);
}
