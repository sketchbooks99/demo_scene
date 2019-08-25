#version 300 es

precision mediump float;
uniform vec2 resolution;
const float PI = 3.1415926;
const float PI2 = PI * 2.0;

in vec2 vTexCoord;

out vec4 fragColor;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

vec3 reset( vec2 p ) {
    float s = sin(p.y * PI);
    float x = cos(p.x * PI2) * s;
    float y = -cos(p.y * PI);
    float z = sin(p.x * PI2) * s;
    return vec3(x, y, z); 
}

void main() {
    // vec2 p = vTexCoord / resolution;
    vec2 p = vTexCoord;
    vec3 reset_val = reset( p );
    float lifetime = rand(p) < 0.3 ? rand( p ) : 1.0;
    fragColor = vec4(normalize(reset_val), lifetime);
}