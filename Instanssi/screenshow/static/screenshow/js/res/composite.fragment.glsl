// Separable blur shader for postprocessing.

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D smpImage;
uniform sampler2D smpBlurred;
uniform sampler2D smpImageParams;

uniform float mixRatio;
uniform float focusDepth;

varying vec2 texCoord;

void main() {
    vec4 image = texture2D(smpImage, texCoord);
    vec4 blurred = texture2D(smpBlurred, texCoord);

    vec4 params = texture2D(smpImageParams, texCoord);

    vec4 composite = mix(image, blurred, mixRatio);
    composite.xyz = pow(composite.xyz, vec3(2.2));
    gl_FragColor = composite;
}
