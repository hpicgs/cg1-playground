#version 300 es

// Shows the samples enlarged: white inside the triangle, gray outside. With dots, each sample is
// a square dot with a black gap of one device pixel on two sides.

precision highp float;

uniform sampler2D samples;

// The bottom left corner of the view in device pixels, the device pixels per sample and whether
// the samples are drawn as dots.
uniform vec2 origin;
uniform float scale;
uniform bool dots;

out vec4 fragColor;

// The colours of a sample outside and inside the triangle.
const vec3 outside = vec3(0.3);
const vec3 inside = vec3(1.0);

void main() {
    vec2 local = gl_FragCoord.xy - origin;
    float value = texelFetch(samples, ivec2(local / scale), 0).r;
    vec3 color = mix(outside, inside, value);

    vec2 within = mod(floor(local), scale);
    if (dots && (within.x >= scale - 1.0 || within.y >= scale - 1.0)) {
        color = vec3(0.0);
    }
    fragColor = vec4(color, 1.0);
}
