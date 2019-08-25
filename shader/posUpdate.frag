#version 300 es
precision mediump float;
uniform sampler2D prevTexture;
uniform sampler2D velocityTexture;
uniform vec2      resolution;
uniform bool      move;
const   float     SPEED = 0.01;

in vec2 vTexCoord;

out vec4 fragColor;

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

const float PI = 3.1415926;
const float PI2 = PI * 2.0;
vec3 reset( vec2 p ) {
    float s = sin(p.y * PI);
    float x = cos(p.x * PI2) * s;
    float y = -cos(p.y * PI);
    float z = sin(p.x * PI2) * s;
    return vec3(x, y, z); 
}

void main(){
    // vec2 coord = gl_FragCoord.st / resolution;
    vec4 prevPosition = texture( prevTexture, vTexCoord );
    vec4 velocity = texture( velocityTexture, vTexCoord );
    // float power = prevPosition.w * 0.99;
    float power = 1.0;
    float lifetime = prevPosition.w - 0.01;
    vec3 position = prevPosition.xyz + velocity.xyz * power * SPEED;
    if(lifetime < 0.0) {
        position = reset( vTexCoord );
        lifetime = velocity.w < 0.3 ? rand( vTexCoord ) : 1.0;
    }
    // vec3 position = prevPosition.xyz + velocity.xyz * power * SPEED;
    if(length(position) > 2.0){
        position = normalize(position);
    }
    fragColor = vec4(position, lifetime);
}
