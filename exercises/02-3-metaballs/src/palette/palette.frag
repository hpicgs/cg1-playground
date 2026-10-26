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

// HSV to RGB as on Kapitel 2, Folie 11,
// with h in [0, 1) instead of degrees.
vec3 hsv2rgb(float h, float s, float v) {
    float sector = floor(6.0 * h);
    float f = 6.0 * h - sector;
    float p = v * (1.0 - s);
    float q = v * (1.0 - s * f);
    float t = v * (1.0 - s * (1.0 - f));

    // h_i on the slide: the sixth of the circle h lies in.
    int hi = int(sector);
    if (hi == 0) {
        return vec3(v, t, p);
    } else if (hi == 1) {
        return vec3(q, v, p);
    } else if (hi == 2) {
        return vec3(p, v, t);
    } else if (hi == 3) {
        return vec3(p, q, v);
    } else if (hi == 4) {
        return vec3(t, p, v);
    }
    return vec3(v, p, q);
}

// F at the position p.
float field(vec2 p) {
    // TODO: implement your code here.
    return 0.0;
}

void main() {
    // TODO: implement your code here.
    fragColor = vec4(color1, 1.0);
}
