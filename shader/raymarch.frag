precision mediump float;

varying vec2 vTexCoord;

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

// probably smooth min function
float smin( float a, float b, float k ) {
    float h = max(k - abs(a - b), 0.0);
    return min(a, b) - h * h * 0.25 / k;
}
vec2 smin( vec2 a, vec2 b, float k ) {
    float h = clamp( 0.5 + 0.5*(b.x - a.x)/k, 0.0, 1.0);
    return mix( b, a, h ) - k * h * (1.0 - h);
}

// probably smooth max function
float smax( float a, float b, float k ) { 
    float h = max( k - abs(a - b), 0.0);
    return max(a, b) + h * h * 0.25 / k;
}

// sphere
float sdSphere( in vec3 p, float rad ) {
    return length(p) - rad;
}

// ellipse
float sdEllipsoid( in vec3 p, in vec3 r ) {
    float k0 = length( p / r );
    float k1 = length( p / (r * r));
    return k0 * (k0 - 1.0) / k1;
}

float map(in vec3 p) {
    float d = sdEllipsoid(p, vec3(0.5, 0.2, 0.2));
    
    float d2 = p.y - (-0.25);

    return min(d, d2);
}

vec3 calcNormal( in vec3 p ) {
    vec2 e = vec2(0.0001, 0.0);
    return normalize( vec3(map(p+e.xyy)-map(p-e.xyy),
                           map(p+e.yxy)-map(p-e.yxy),
                           map(p+e.yyx)-map(p-e.yyx)
    ));
}

float castRay( in vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i=0; i<100; i++) {
        vec3 pos = ro + t * rd;

        float h = map( pos );
        if( h < 0.001 ) 
            break;
        t += h;
        if(t > 20.0) break;
    }
    if ( t > 20.0 ) t = -1.0;

    return t;
}

void main() {
    vec2 p = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);

    float an = time;

    vec3 ro = vec3(1.0 * sin(an), 0.0, 1.0 * cos(an));        // ray original position
    vec3 ta = vec3(0.0, 0.0, 0.0);

    vec3 ww = normalize( ta - ro );
    vec3 uu = normalize( cross(ww, vec3(0.0, 1.0, 0.0)));
    vec3 vv = normalize( cross(uu, ww) );

    vec3 rd = normalize( p.x * uu + p.y * vv + 1.5 * ww );
    
    vec3 col = vec3(0.0);

    float t = castRay( ro, rd );
    
    if (t > 0.0) {
        vec3 pos = ro + t * rd;
        vec3 nor = calcNormal(pos);

        vec3 sun_dir = normalize(vec3(0.8, 0.4, -0.2) );
        float sun_dif = clamp( dot(nor, sun_dir), 0.0, 1.0);
        float sun_sha = step( castRay( pos+nor*0.001, sun_dir ), 0.0 );
        float sky_dif = clamp( 0.5 + 0.5*dot(nor, vec3(0.0, 1.0, 0.0)), 0.0, 1.0);
        col = vec3(1.0, 0.7, 0.5) * sun_dif * sun_sha;
        col += vec3(0.0, 0.2, 0.4) * sky_dif;
    }
    gl_FragColor = vec4(col, 1.0);
}