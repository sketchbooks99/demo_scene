#version 300 es

uniform mat4 mvpMatrix;

in vec3 position;
in vec2 texcoord;

out vec2 vTexCoord;

void main() {
    // gl_Position = vec4(position, 1.0);
    vTexCoord = texcoord;
    gl_Position = mvpMatrix * vec4(position, 1.0);
}