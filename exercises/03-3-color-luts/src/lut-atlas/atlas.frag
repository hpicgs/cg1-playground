#version 300 es

// Shows a part of the LUT image, without interpolation. region holds the texture coordinates
// of the part's top left and bottom right corner.

precision highp float;

uniform sampler2D lut;
uniform vec4 region;

in vec2 uv;

out vec4 fragColor;

void main() {
    vec2 st = mix(region.xy, region.zw, uv);
    fragColor = vec4(texture(lut, st).rgb, 1.0);
}
