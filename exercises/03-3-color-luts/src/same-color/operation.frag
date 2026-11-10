#version 300 es

// Computes the output image: pixel (i, j) of the output reads pixel (i, j) of the input and
// applies the chosen operation.

precision highp float;

uniform sampler2D image;
uniform vec2 size;
uniform int operation;

out vec4 fragColor;

const float gamma = 2.2;

// Kontrastanpassung: the fixed middle M and the factor alpha.
const float M = 0.5;
const float alpha = 1.6;
const float epsilon = 0.001;

// Vignette: how much the corners are darkened.
const float strength = 0.8;

// Glättung: the mipmap level that is read; level 2 averages 4 × 4 pixels.
const float smoothingLevel = 2.0;

vec3 gammaCorrection(vec3 c) {
    return pow(c, vec3(1.0 / gamma));
}

vec3 contrast(vec3 c) {
    float I = dot(c, vec3(0.2126, 0.7152, 0.0722));
    float adjusted = M + alpha * (I - M);
    float lambda = adjusted / max(I, epsilon);
    return lambda * c;
}

vec3 smoothing(vec2 uv) {
    return textureLod(image, uv, smoothingLevel).rgb;
}

vec3 vignette(vec3 c, vec2 uv) {
    // The distance from the image centre, 1 in the corners.
    float d = length(uv - 0.5) / length(vec2(0.5));
    return c * (1.0 - strength * d * d);
}

void main() {
    ivec2 pixel = ivec2(gl_FragCoord.xy);
    vec2 uv = gl_FragCoord.xy / size;
    vec3 c = texelFetch(image, pixel, 0).rgb;

    vec3 result = c;
    if (operation == 0) {
        result = gammaCorrection(c);
    } else if (operation == 1) {
        result = contrast(c);
    } else if (operation == 2) {
        result = smoothing(uv);
    } else if (operation == 3) {
        result = vignette(c, uv);
    }
    fragColor = vec4(result, 1.0);
}
