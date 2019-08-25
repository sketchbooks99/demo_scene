#version 300 es

precision mediump float;

uniform vec4 globalColor;

in float vAlpha;
in float vLifetime;

out vec4 fragColor;

void main() {
    fragColor = vec4(1.0 - vLifetime, vLifetime, 0.0, 1.0) * vec4( vec3(1.0), vAlpha );
}