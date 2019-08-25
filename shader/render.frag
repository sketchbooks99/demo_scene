#version 300 es

precision mediump float;

uniform vec4 globalColor;

in float vAlpha;

out vec4 fragColor;

void main() {
    fragColor = globalColor * vec4( vec3(1.0), vAlpha );
}