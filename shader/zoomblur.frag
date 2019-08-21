precision mediump float;

varying vec2 vTexCoord;

uniform vec2 window_size;
uniform float strength;
uniform sampler2DRect texture;

const float tFrag = 1.0 / window_size.x;
const float nFrag = 1.0 / 30.0;
const vec2 centerOffset = window_size * 0.5;

float rnd(vec3 scale, float seed) {
    return fract(sin(dot(gl_FragCoord.stp + seed, scale)) * 43758.5433 + seed);
}

void main() {
    vec3 destColor = vec3(0.0);
    float random = rnd(vec3(12.9898, 78.233, 151.7182), 0.0);
    vec2 fc = vec2(gl_FragCoord.s, window_size - gl_FragCoord.t);
    vec2 fcc = fc - centerOffset;
    float totalWeight = 0.0;

    for (int i=0; i<30; i++) {
        float percent = (i + random) * nFrag;
        float weight = percent - percent * percent;
        vec2 t = fc - fcc * percent * strength * nFrag;
        destColor += texture2D(texture, t * tFrag).rgb * weight;
        totalWeight += weight;
    }
    gl_FragCoord = vec4(destColor / totalWeight, 1.0);
}