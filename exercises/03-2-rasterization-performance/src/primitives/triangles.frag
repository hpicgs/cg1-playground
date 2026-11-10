#version 300 es

// Runs once for every fragment. Either colours the fragment by the triangle it belongs to, or
// gives every fragment the same colour, which Verblendung adds to the pixel.

precision highp float;

flat in int corner;

// One colour per corner index; a triangle gets the colour of its last corner.
uniform vec3 colors[6];
// true: every fragment gets addColor.
uniform bool adding;
uniform vec3 addColor;

out vec4 fragColor;

void main() {
    if (adding) {
        fragColor = vec4(addColor, 1.0);
    } else {
        fragColor = vec4(colors[corner % 6], 1.0);
    }
}
