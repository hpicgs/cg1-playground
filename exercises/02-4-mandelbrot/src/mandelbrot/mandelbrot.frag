#version 300 es

// The Mandelbrot set, coloured by the iteration count.

precision highp float;

uniform float xmin;
uniform float xmax;
uniform float ymin;
uniform float ymax;
uniform int maxIterations;
uniform vec3 insideColor;

in vec2 uv;

out vec4 fragColor;

// The iteration count of c, or 0 if the sequence does not diverge within maxIterations
// iterations.
int mandelbrot(vec2 c) {
    // TODO: implement your code here.
    return 0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(uv, 0.0, 1.0);
}
