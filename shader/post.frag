#version 300 es

precision mediump float;

in vec2 vTexCoord;

uniform float time;
uniform sampler2D sceneTex;
uniform vec2 resolution;

out vec4 fragColor;

void main() {
    vec2 p = (vTexCoord * 2.0 - resolution) / min(resolution.x, resolution.y);

    float len = step( length(p), 0.7 );

    vec2 texCoord = vTexCoord / resolution;
    vec4 texColor = texture(sceneTex, texCoord);

    fragColor = texColor * vec4(vec3(len), 1.0);
}