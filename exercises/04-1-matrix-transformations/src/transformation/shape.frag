#version 300 es

// One colour for every fragment. Points are round: fragments outside the circle are dropped.

precision highp float;

uniform vec3 color;
uniform float pointSize;

out vec4 fragColor;

void main() {
    if (pointSize > 0.0 && length(gl_PointCoord - 0.5) > 0.5) {
        discard;
    }
    fragColor = vec4(color, 1.0);
}
