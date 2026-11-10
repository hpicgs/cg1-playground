#version 300 es

// Runs once for every fragment. The thin rectangle is white. The background draws the second line
// itself: a fragment is white if it lies at most half the line width away from the line segment.

precision highp float;

in vec2 local;

// Whether this draw is the background with the line from the shader.
uniform bool shaderLine;
// The line segment and its width, in pixel coordinates of the raster.
uniform vec2 lineStart;
uniform vec2 lineEnd;
uniform float lineWidth;

out vec4 fragColor;

void main() {
    float value = 1.0;
    if (shaderLine) {
        vec2 along = lineEnd - lineStart;
        vec2 offset = local - lineStart;
        // How far along the segment (0 to 1) and how far from it the fragment is.
        float t = dot(offset, along) / dot(along, along);
        float distance = abs(offset.x * along.y - offset.y * along.x) / length(along);
        value = t >= 0.0 && t <= 1.0 && distance <= 0.5 * lineWidth ? 1.0 : 0.0;
    }
    fragColor = vec4(vec3(value), 1.0);
}
