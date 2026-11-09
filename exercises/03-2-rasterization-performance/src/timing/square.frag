#version 300 es

// Runs once for every fragment. The colour is half transparent; Verblendung mixes it with the
// colour already in the raster.

precision highp float;

flat in int parity;

out vec4 fragColor;

void main() {
    vec3 color = parity == 0 ? vec3(0.36, 0.62, 0.93) : vec3(0.88, 0.56, 0.36);
    fragColor = vec4(color, 0.5);
}
