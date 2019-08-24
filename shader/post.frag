precision mediump float;

varying vec2 vTexCoord;

uniform float time;
uniform sampler2D sceneTex;
uniform vec2 resolution;

void main() {
    vec2 p = (gl_FragCoord.st * 2.0 - resolution) / min(resolution.x, resolution.y);

    float len = step( length(p), 0.7 );

    vec2 texCoord = gl_FragCoord.st / resolution;
    vec4 texColor = texture2D(sceneTex, texCoord);

    gl_FragColor = texColor * vec4(vec3(len), 1.0);
}