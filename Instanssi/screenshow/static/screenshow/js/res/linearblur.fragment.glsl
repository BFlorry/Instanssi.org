// Separable blur shader for postprocessing.

#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D smpImage;
uniform vec2 dir;

varying vec2 texCoord;

float rand() {
  return fract(sin(dot(gl_FragCoord.xy * 0.001, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec4 sum = vec4(0.0);
    //gl_FragColor = texture2D(smpImage, texCoord); return;

    // This weighting doesn't seem to separate well. Oh well, we have the GPU.

    float val = 0.00001;
    float angle = rand() * 3.14159;
    vec2 v = vec2(cos(angle), sin(angle)) * length(dir);

    for(int i=-5; i<6; i++) {
      vec4 sample = texture2D(smpImage, texCoord + v * float(i));
      val += sample.w;
      sum += vec4(sample.xyz * sample.w, sample.w);
    }
    gl_FragColor = vec4(sum.xyz / val, sum.w / 11.0);
}
