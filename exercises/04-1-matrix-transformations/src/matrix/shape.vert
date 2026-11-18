#version 300 es

// Points of the plane in homogeneous coordinates. transform is the 3 x 3 matrix of the
// transformation, center and halfSize say which part of the plane the canvas shows.

in vec2 position;

uniform mat3 transform;
uniform vec2 center;
uniform vec2 halfSize;
uniform float pointSize;

void main() {
    vec3 transformed = transform * vec3(position, 1.0);
    vec2 point = transformed.xy / transformed.z;
    gl_Position = vec4((point - center) / halfSize, 0.0, 1.0);
    gl_PointSize = pointSize;
}
