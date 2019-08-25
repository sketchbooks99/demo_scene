#version 300 es

in vec2 texcoord;
uniform mat4 mvpMatrix;
uniform float pointSize;
uniform sampler2D positionTexture;
out float vAlpha;
void main(){
    vec4 position = texture(positionTexture, texcoord);
    vAlpha = 1.0 - smoothstep(1.0, 2.0, length(position.xyz));
    gl_Position = mvpMatrix * vec4(position.xyz, 1.0);
    gl_PointSize = pointSize * max(position.w, 0.5);
}
