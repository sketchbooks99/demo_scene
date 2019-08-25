#version 300 es

in vec2 texcoord;
uniform mat4 mvpMatrix;
uniform float pointSize;
uniform sampler2D positionTexture;
out float vAlpha;
out float vLifetime;
void main(){
    vec4 position = texture(positionTexture, texcoord);
    vAlpha = 1.0 - smoothstep(1.0, 2.0, length(position.xyz));
    vLifetime = position.w;
    gl_Position = mvpMatrix * vec4(position.xyz, 1.0);
    gl_PointSize = pointSize;
}
