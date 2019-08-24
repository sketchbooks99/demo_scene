uniform mat4 mvpMatrix;

attribute vec3 position;
attribute vec2 texcoord;

varying vec2 vTexCoord;

void main() {
    // gl_Position = vec4(position, 1.0);
    vTexCoord = texcoord;
    gl_Position = mvpMatrix * vec4(position, 1.0);
}