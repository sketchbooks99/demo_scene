#version 300 es

precision mediump float;
uniform vec2 resolution;
const float PI = 3.1415926;
const float PI2 = PI * 2.0;

in vec2 vTexCoord;

out vec4 fragColor;

void main() {
    // vec2 p = vTexCoord / resolution;
    vec2 p = vTexCoord;
    float s = sin(p.y * PI);
    float x = cos(p.x * PI2) * s;
    float y = -cos(p.y * PI);
    float z = sin(p.x * PI2) * s;
    fragColor = vec4(normalize(vec3(x, y, z)), 0.0);
}