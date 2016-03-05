#ifdef GL_ES
precision highp float;
#endif

attribute vec3 pos; // this is the vertex pos input by default
varying vec2 texCoord;

void main() {
    texCoord = vec2(pos.xy) * 0.5 + 0.5;
    gl_Position = vec4(pos, 1.0);
}
