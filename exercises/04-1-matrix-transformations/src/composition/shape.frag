#version 300 es

// One colour for every fragment. Points are round: fragments outside the circle are dropped.
// With hatch above 0, only diagonal stripes hatch pixels apart are drawn.

precision highp float;

uniform vec3 color;
uniform float pointSize;
uniform float hatch;

out vec4 fragColor;

void main() {
    if (pointSize > 0.0 && length(gl_PointCoord - 0.5) > 0.5) {
        discard;
    }
    if (hatch > 0.0 && mod(gl_FragCoord.x + gl_FragCoord.y, hatch) > 0.3 * hatch) {
        discard;
    }
    fragColor = vec4(color, 1.0);
}
