// GPU stress test and scene-interpreting stochastic raytracer.

#ifdef GL_ES
precision mediump float; // can we test this on anything?
#endif

uniform vec3 cameraPos;
uniform vec3 cameraMotion;
uniform vec4 cameraQuat;
uniform vec4 cameraQuatPrev;
uniform vec4 cameraParams; // near, far, aspect, focusDistance
uniform float time;
uniform float backgroundAlpha;

uniform vec3 lightDir;
uniform vec3 lightColor;
uniform vec3 ambientTop;
uniform vec3 ambientCenter;
uniform vec3 ambientBottom;

varying vec2 texCoord;

uniform sampler2D smpSceneData0;
uniform sampler2D smpSceneData1;

uniform samplerCube smpCube;

#define CAMERA_NEAR (cameraParams.x)
#define CAMERA_FAR (cameraParams.y)
#define CAMERA_ASPECT (cameraParams.z)
#define CAMERA_FOCUS (cameraParams.w)

// planes don't have color info right now so use this
#define PLANE_COLOR vec3(0.1)

#define M_PI 3.1415926535897932384626433832795
#define M_PI2 (M_PI * 2.0)
#define NUM_SAMPLES 1
#define DO_LENS_EFFECT
#define DO_REFLECTIONS

#define AVOID_CONTROL_LOGIC // tries to avoid small if-else structures.

// WebGL tries to avoid requiring arbitrary looping support in shaders.
// It's completely pointless with modern GPUs, though.
// Using this should make sure it never unrolls loops.
// WARNING: This may freeze or crash Microsoft Edge.
#define WHILE_TRUE for(int _asdf = 0; _asdf == 0; _asdf += 0)

// High values may severely hit performance on bad WebGL implementations.
#define MAX_POLY_PLANES 20

// Frame time fraction for the current ray.
float t;


vec2 sceneOffset(int offset) {
    // The texture is currently 2048x1/RGBA32F.
    // If we need more data than 2048 x 4 float32s, we could use a
    // taller texture, but then data locality might become an issue.
    // Might be worth the ALU time to arrange the data into space-filling
    // curves of some sort.
    return vec2(float(offset) / 2048.0, 0.0);
}

vec4 sceneFetch0(int offset) {
    return texture2D(smpSceneData0, sceneOffset(offset), 0.0);
}

vec4 sceneFetch1(int offset) {
    // Would this be faster if we stored both in the same texture,
    // alternating between previous data and the new stuff?
    // Generating the texture would be harder, though.
    return texture2D(smpSceneData1, sceneOffset(offset), 0.0);
}

vec2 toSigned2(vec2 v) {
    return v * 2.0 - vec2(1.0);
}

vec3 toLinear(vec3 color) {
    return pow(color, vec3(1.0 / 2.2)); // close enough
}

vec3 toGamma(vec3 color) {
    return pow(color, vec3(2.2));
}

float rand(vec2 co) {
#ifdef LIVING_RANDOM
    return fract(sin(dot(co.xy + vec2(time * 0.001), vec2(12.9898, 78.233))) * 43758.5453);
#else
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
#endif
}

vec2 rand2(vec2 co) {
    return vec2(rand(co), rand(co.yx));
}

// Rotates a vector by a quaternion, encoded in a
// vec4 as a vector and scalar (xyz, w).
vec3 quatRotate(vec4 q, vec3 v) {
    return vec3(
        v.x * (q.w*q.w + q.x*q.x - q.y*q.y - q.z*q.z) +
        v.y * ((q.x*q.y + q.w*q.z) * 2.0) +
        v.z * ((q.x*q.z - q.w*q.y) * 2.0),

        v.x * ((q.x*q.y - q.w*q.z) * 2.0) +
        v.y * (q.w*q.w - q.x*q.x + q.y*q.y - q.z*q.z) +
        v.z * ((q.y*q.z + q.w*q.x) * 2.0),

        v.x * ((q.x*q.z + q.w*q.y) * 2.0) +
        v.y * ((q.y*q.z - q.w*q.x) * 2.0) +
        v.z * (q.w*q.w - q.x*q.x - q.y*q.y + q.z*q.z)
    );
}

bool testSphere(vec3 origin, vec3 dir, vec3 center, float radius, out float pos);

vec3 getAmbient(vec3 dir) {
    vec3 top = mix(ambientCenter, ambientTop, dir.z);
    vec3 bottom = mix(ambientCenter, ambientBottom, -dir.z);
    return mix(top, bottom, step(0.0, dir.z));
    /*vec3 cubeSample = toLinear(textureCube(smpCube, dir).xyz);
    //cubeSample = pow(cubeSample, vec3(2.0)) * 2.0;
    return cubeSample;*/
}

// Checks if there is anything on the line from origin to dir * INF
float shadowTrace(vec3 origin, vec3 dir) {
    int offset = 0;
    WHILE_TRUE {
        vec4 first = sceneFetch0(offset);
        if(first.x == 1.0) { // sphere
            // sphere; we only check against them for now.
            vec3 center = first.yzw;
            float radius = sceneFetch0(offset + 1).x;
            float p;
            if(testSphere(origin, dir, center, radius, p)) {
                return 0.0;
            }
            offset += 2;
        } else if(first.x == 2.0) { // polyhedron
            int numPlanes = int(first.y);
            offset += numPlanes + 1;
        } else if(first.x == 3.0) { // bounding sphere
            vec4 second = sceneFetch0(offset + 1);
            vec3 center = second.xyz;
            float radius = second.w;
            if(!testSphere(origin, dir, center, radius, radius)) {
                offset += int(first.y);
            } else {
                offset += 2;
            }
        } else {
            break;
        }
    }
    return 1.0;
}


vec3 shadeNoBounce(vec3 pos, vec3 dir, vec3 diffuse, vec3 normal) {
    vec3 reflected = reflect(dir, normal);
    float fresnel = 1.0 - max(0.0, dot(dir, -normal));
    fresnel = 0.5 + fresnel * 0.5;

    vec3 exposure = getAmbient(reflected) * fresnel;

    //vec3 exposure = textureCube(smpCube, reflected).xyz * fresnel;
    vec3 direct = lightColor * max(0.0, dot(normal, lightDir)) * diffuse;
    // specular
    direct += pow(max(0.0, dot(lightDir, reflected)), 100.0) * fresnel;
    exposure += direct * shadowTrace(pos, lightDir);
    return exposure;
}


void drawPlaneNoBounce(vec3 origin, vec3 dir, vec4 plane,
                       inout float x, inout vec3 sample)
{
    float vel = dot(plane.xyz, dir);
    float dist = dot(origin, plane.xyz) + plane.w;
    if(vel >= 0.0) {
        return; // moving away from plane
    }
    float x0 = dist / vel;
    if(x0 < x) {
        sample = shadeNoBounce(origin + dir * x0, dir, PLANE_COLOR, plane.xyz);
        x = x0;
    }
}

void drawSphereNoBounce(vec3 origin, vec3 dir, vec3 center, float radius, vec3 diffuse,
                        inout float x, inout vec3 sample)
{
    vec3 to = origin - center;
    float drt = dot(dir, to);
    if(drt > 0.0) {
        // We don't care about colliding from inside.
        // Besides, shadows are easier this way.
        return;
    }
    float b = 2.0 * drt;
    float c = dot(to, to) - radius * radius;

    float dc = drt * drt - dot(to, to) + radius * radius;

    float x0, x1;
    if(dc < 0.0) {
        return;
    }
    if(abs(dc) < 0.00005) {
        x0 = -drt;
        x1 = -drt;
    } else {
        x0 = -drt + sqrt(dc);
        x1 = -drt - sqrt(dc);
    }
    if(x1 < x0) {
        x0 = x1;
    }

    if(x0 < x) {
        x = x0;
        vec3 pos = origin + dir * x0;
        sample = shadeNoBounce(origin, dir, diffuse, normalize(pos - center));
    }
}


bool testSphere2(vec3 origin, vec3 dir, vec3 center, float radius) {
    vec3 to = origin - center;
    float drt = dot(dir, to);
    if(drt > 0.0 && length(to) >= radius) {
        return false;
    }
    float dc = drt * drt - dot(to, to) + radius * radius;

    // We're only interested in whether the equation can be solved or not
    // and already rejected the facing-away case.
    return dc >= 0.0;
}


vec3 reflectionTrace(vec3 origin, vec3 dir) {
    int offset = 0;
    vec3 sample = getAmbient(dir);
    float x = 900000.0;
    WHILE_TRUE {
        vec4 first = sceneFetch0(offset);
        vec4 second = sceneFetch0(offset + 1);
        if(first.x == 1.0) { // sphere
            vec4 first1 = sceneFetch1(offset);
            vec4 second1 = sceneFetch1(offset + 1);
            vec3 pos = mix(first.yzw, first1.yzw, t);
            drawSphereNoBounce(origin, dir, pos, second.x, second.yzw, x, sample);
            offset += 2;
        } else if(first.x == 2.0) { // polyhedron
            int numPlanes = int(first.y);
            // just treat it as a plane for now
            drawPlaneNoBounce(origin, dir, second.xyzw, x, sample);
            offset += numPlanes + 1;
        } else if(first.x == 3.0) { // bounding sphere
            if(!testSphere2(origin, dir, second.xyz, second.w)) {
                offset += int(first.y);
            } else {
                offset += 2;
            }
        } else {
            break;
        }
    }
    // reflection rays always hit something
    return sample;
}

vec3 shade(vec3 pos, vec3 dir, vec3 diffuse, vec3 normal) {
    vec3 reflected = reflect(dir, normal);
#if 1
    float fresnel = 1.0 - max(0.0, dot(dir, -normal));
    fresnel = 0.5 + fresnel * 0.5;
#else
    float fresnel = 1.0;
#endif
#ifdef DO_REFLECTIONS
    vec3 exposure = reflectionTrace(pos + reflected * 0.0001, reflected) * fresnel;
    exposure *= vec3(1.0) - diffuse;
#else
    vec3 exposure = getAmbient(reflected) * fresnel;
#endif

    vec3 direct = lightColor * max(0.0, dot(normal, lightDir));
    direct *= diffuse;
    direct += pow(max(0.0, dot(lightDir, reflected)), 100.0) * fresnel;

    // TODO: Can we somehow defer this (and shading in general)
    // until we've found all the ray hits?
    // This is seriously expensive, at least under ANGLE.
    exposure += direct * shadowTrace(pos, lightDir);

    return exposure;
}

bool testSphere(vec3 origin, vec3 dir, vec3 center, float radius, out float pos) {
    vec3 to = origin - center;
    float drt = dot(dir, to);
    if(drt > 0.0) {
        // We don't care about colliding from inside.
        // Besides, shadows are easier this way.
        return false;
    }
    float b = 2.0 * drt;
    float c = dot(to, to) - radius * radius;

    float dc = drt * drt - dot(to, to) + radius * radius;

    float x0, x1;
    if(dc < 0.0) {
        return false;
    }
    if(abs(dc) < 0.00005) {
        x0 = -drt;
        x1 = -drt;
    } else {
        x0 = -drt + sqrt(dc);
        x1 = -drt - sqrt(dc);
    }
    if(x1 < x0) {
        x0 = x1;
    }
    pos = x0;
    return true;
}

bool drawSphere(vec3 origin, vec3 dir, inout float x, inout vec3 sample,
                vec3 center, vec3 diffuse, float radius)
{
    float x0 = CAMERA_FAR;
    bool hit = testSphere(origin, dir, center, radius, x0);
    if(hit && x0 <= x && x0 >= CAMERA_NEAR) {
        x = x0;
        vec3 colPos = origin + dir * x0;
        vec3 normal = normalize(colPos - center);
        sample = shade(colPos, dir, diffuse, normal);
        return true;
    }
    return false;
}

vec3 rayOrigins[NUM_SAMPLES];
vec3 rayDirs[NUM_SAMPLES];
float rayTimes[NUM_SAMPLES];

// Tests ray against a convex polyhedron delimited by planes.
bool testPolyhedron(vec3 origin, vec3 dir, int numPlanes, int offset,
                    inout float x, inout vec3 sample)
{
    // FIXME: Handle multiple planes correctly.
    float xNear = CAMERA_FAR;
    float xFar = CAMERA_NEAR;
    vec3 normal;
    int k = 0;

    WHILE_TRUE {
        if(k >= numPlanes) {
            break; continue;
        }
        vec4 plane = sceneFetch0(offset + k);
        float planeDot = dot(dir, plane.xyz);
        float dist = dot(origin, plane.xyz) + plane.w;

        if(abs(planeDot) < 0.00001 && dist > 0.0) {
            return false;
        }
        float x0 = dist / -planeDot;
        if(planeDot < 0.0) { // front facing
            if(x0 < xFar) {
                return false;
            }
            if(x0 < xNear) {
                xNear = x0;
                normal = plane.xyz;
            }
        } else { // backface
            if(x0 > xNear) {
                return false;
            }
            if(x0 > xFar) {
                xFar = x0;
            }
        }
        k++;
    }
    if(xNear < x) {
        x = xNear;
        vec3 colPos = origin + dir * x;
        sample = shade(colPos, dir, PLANE_COLOR, normal);
        return true;
    }
    return false;
}

vec3 samples[NUM_SAMPLES];
float xs[NUM_SAMPLES];
bool hits[NUM_SAMPLES];

vec4 testScene(vec2 rnd) {
    /*
    scenecode = { object }
    object = sphere | polyhedron | metashit
    TOKEN_SPHERE = 1.0f
    TOKEN_POLYHEDRON = 2.0f
    material = diffuseColor : vec3
    sphere = TOKEN_SPHERE, vec3: center, radius: float, material
    polyhedron = TOKEN_POLYHEDRON, numPlanes: float, (padding), { planes: vec4 }

    To avoid the load of tons of fetches, we pack this into a RGBA32F texture,
    aligning to whole RGBAs where convenient.
    */

    int offset = 0;

    // initialize per-sample ray parameters
    for(int j=0; j<NUM_SAMPLES; j++) {
        samples[j] = vec3(0.0);
        xs[j] = CAMERA_FAR;
        hits[j] = false;
    }

    WHILE_TRUE {
        // read a scenecode RGBA and check the token
        vec4 first0 = sceneFetch0(offset);
        float id = first0.x;
        if(id == 1.0) { // sphere
            vec4 first1 = sceneFetch1(offset);
            vec3 center0 = first0.yzw;
            vec4 second0 = sceneFetch0(offset + 1);
            float radius0 = second0.x;
            vec3 diffuse0 = second0.yzw;

            vec3 center1 = first1.yzw;
            vec4 second1 = sceneFetch1(offset + 1);
            float radius1 = second1.x;
            vec3 diffuse1 = second1.yzw;

            for(int j=0; j<NUM_SAMPLES; j++) {
                t = rayTimes[j];
                vec3 center = mix(center1, center0, t);
                float radius = mix(radius1, radius0, t);
                vec3 diffuse = mix(diffuse1, diffuse0, t);

                vec3 origin = rayOrigins[j];
                vec3 dir = rayDirs[j];
                hits[j] = drawSphere(origin, dir, xs[j], samples[j],
                                     center, diffuse, radius) || hits[j];
            }
            offset += 2;
        } else if(id == 2.0) { // polyhedron
            // The first RGBA contains the token and number of planes.
            // (where does the color go? next one?)
            int numPlanes = int(first0.y);

            for(int j=0; j<NUM_SAMPLES; j++) {
                // TODO: lerp plane equations for motion too?
                t = rayTimes[j];
                vec3 origin = rayOrigins[j];
                vec3 dir = rayDirs[j];
                hits[j] = testPolyhedron(origin, dir,
                    numPlanes, offset + 1, xs[j], samples[j]) || hits[j];
            }
            offset += numPlanes + 1;
        } else if(id == 3.0) { // bounding volume sphere
            vec4 second = sceneFetch0(offset + 1);
            vec3 center = second.xyz;
            float radius = second.w;

            // TODO: we could do a fast z-fail of some sort by checking
            // the current ray-0 x against the sphere too.
            if(!testSphere2(rayOrigins[0], rayDirs[0], center, radius)) {
                offset += int(first0.y);
            } else {
                offset += 2;
            }
        } else {
            break; continue;
        }
    }

    // TODO: If we deferred any reflections, they need to be traced here.

    float alpha = 0.0;
    vec3 sample = vec3(0.0);
    for(int j=0; j<NUM_SAMPLES; j++) {
        sample += samples[j];
        alpha += hits[j] ? 1.0 : 0.0;
    }
    sample /= float(NUM_SAMPLES);
    alpha /= float(NUM_SAMPLES);
    return vec4(sample, alpha);
}

vec4 quatSlerp(vec4 a, vec4 b, float x) {
    float dp = dot(a.xyz, b.xyz);
    if(dp > 0.999) {
        return normalize(mix(a, b, x));
    }
    dp = clamp(dp, -1.0, 1.0);
    float theta = x * acos(dp);
    vec4 c = normalize(b - a * dp); // orthonormalize
    return normalize(a * cos(theta) + c * sin(theta));
}

vec4 getTracedColor(vec2 rnd) {
    vec2 rayPos = toSigned2(texCoord);
    vec3 rayDir = vec3(rayPos.xy * 0.5, -1.0);
    rayDir.x *= CAMERA_ASPECT;

    // Init rays for each sample.
    for(int j=0; j<NUM_SAMPLES; j++) {
        vec2 rndS = rand2(rnd + vec2(float(j) * 0.1));
        rayTimes[j] = rndS.x;
        vec3 camPos = cameraPos.xyz + cameraMotion.xyz * rndS.x;
        vec4 randomQuat = mix(cameraQuatPrev, cameraQuat, rndS.x);
        //vec4 randomQuat = quatSlerp(cameraQuatPrev, cameraQuat, rndS.x);

        vec3 rayDirS = quatRotate(randomQuat, rayDir);
#ifdef DO_LENS_EFFECT
        float focusScale = CAMERA_FOCUS * 0.9;

        // the position our fragment's rays would like to "focus" on
        vec3 focusOffset = rayDirS * CAMERA_FOCUS;

        // produce distributions on a unit-sized lens.
        // TODO: Try different distributions to simulate other lenses.
        float rndAngle = rndS.x * M_PI * 2.0;
        //vec2 rndLensPos = vec2(-0.7, 0.0) + vec2(0.7, 0.7) * rndS.x + vec2(0.7, -0.7) * rndS.y;
        vec2 rndLensPos = vec2(cos(rndAngle), sin(rndAngle)) * sqrt(rndS.y);

        // scale distributions to focus range on lens
        vec3 lensSrcOffset = vec3(rndLensPos, 0.0) * CAMERA_FOCUS / focusScale;
        lensSrcOffset = quatRotate(randomQuat, lensSrcOffset);

        vec3 lensDirOffset = -lensSrcOffset / CAMERA_FOCUS;

        rayDirS += lensDirOffset;
        camPos = camPos + lensSrcOffset;
#endif
        rayDirs[j] = normalize(rayDirS);
        rayOrigins[j] = camPos;
    }

    vec4 result = testScene(rnd);

#ifdef AVOID_CONTROL_LOGIC
    result += step(0.5, backgroundAlpha) * vec4(getAmbient(rayDirs[0]), 1.0) * (1.0 - result.w);
#else
    if(backgroundAlpha > 0.0) {
        result += vec4(getAmbient(rayDirs[0]), 1.0) * (1.0 - result.w);
    }
#endif

    return result;
}

void main() {
    vec4 res = getTracedColor(rand2(texCoord));
    // vignette
    res.xyz *= 1.0 - distance(vec2(0.5), texCoord) * 0.2;

    res.xyz = toGamma(res.xyz);

#if NUM_SAMPLES > 1
    res.xyz /= res.w + 0.0001;
#endif

    // raw 8 bits per component sometimes shows banding on gradients
    res.xyz += vec3(rand(texCoord * 0.4523) / 256.0);
    gl_FragColor = res;
}
