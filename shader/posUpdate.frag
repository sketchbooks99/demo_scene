#version 300 es
precision mediump float;
uniform sampler2D prevTexture;
uniform sampler2D velocityTexture;
uniform vec2      resolution;
uniform bool      move;
const   float     SPEED = 0.0034;

in vec2 vTexCoord;

out vec4 fragColor;
void main(){
    // vec2 coord = gl_FragCoord.st / resolution;
    vec4 prevPosition = texture( prevTexture, vTexCoord );
    vec4 velocity = texture( velocityTexture, vTexCoord );
    float power = prevPosition.w * 0.99;
    if(move){
        power = 2.0;
    }
    vec3 position = prevPosition.xyz + velocity.xyz * power * SPEED;
    if(length(position) > 2.0){
        position = normalize(position);
    }
    fragColor = vec4(position, power);
}
