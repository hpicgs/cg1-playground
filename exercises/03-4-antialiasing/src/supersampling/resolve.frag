#version 300 es

// Runs once for every pixel of the raster and writes its colour from the pixel's samples.

precision highp float;

// The samples: the triangle rasterized with n × n texels for every pixel of the raster.
uniform sampler2D samples;
uniform int n;

out vec4 fragColor;

void main() {
    // The first of the n × n texels that belong to this pixel.
    ivec2 first = ivec2(gl_FragCoord.xy) * n;

    // TODO: implement your code here.
    fragColor = texelFetch(samples, first + n / 2, 0);
}
