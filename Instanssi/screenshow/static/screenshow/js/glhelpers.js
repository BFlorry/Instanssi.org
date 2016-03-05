/**
 * Some utility functions for WebGL graphics.
 * License: WTFPL.
 */
var glh = (function () {
    function glh() {
    }
    glh.createIndexBuffer = function (gl, indices, intent) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(indices), intent || gl.STATIC_DRAW);
        return buffer;
    };
    glh.createVertexBuffer = function (gl, vertices, intent) {
        var buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), intent || gl.STATIC_DRAW);
        return buffer;
    };
    glh.getShaderUniform = function (gl, shader, name, shaderName) {
        shader[name] = gl.getUniformLocation(shader.program, shaderName);
    };
    glh.getShaderAttrib = function (gl, shader, name, shaderName) {
        shader[name] = gl.getAttribLocation(shader.program, shaderName);
    };
    glh.bindSampler = function (gl, shader, name, binding) {
        var loc = gl.getUniformLocation(shader.program, name);
        if (!loc) {
            console.error("Program does not contain uniform " + name);
        }
        gl.uniform1i(loc, binding);
    };
    // builds individual shader of given type, with error checking.
    glh.buildShader = function (gl, type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("Shader build failed: " + gl.getShaderInfoLog(shader));
            return null;
        }
        return shader;
    };
    // builds shader program from given strings; returns program or null
    glh.buildShaderProgram = function (gl, vertexSource, fragmentSource) {
        var vertexShader = glh.buildShader(gl, gl.VERTEX_SHADER, vertexSource);
        var fragmentShader = glh.buildShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
        if (!(vertexShader && fragmentShader)) {
            return null; // already emitted an error so just return
        }
        var program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Program link failed: " + gl.getProgramInfoLog(program));
            return null;
        }
        gl.useProgram(program);
        return {
            program: program
        };
    };
    glh.createRenderTarget = function (gl, width, height, needsDepth, colorCount) {
        var depthBuffer;
        colorCount = colorCount || 1;
        var textures = [];
        var fb = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        for (var i = 0; i < colorCount; i++) {
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, tex, 0);
            textures.push(tex);
        }
        // create depth buffer if requested
        if (needsDepth) {
            depthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        }
        var result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        // check for some common errors
        if (result === gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT) {
            console.error("Framebuffer not attachment complete!");
        }
        else if (result === gl.FRAMEBUFFER_UNSUPPORTED) {
            console.error("Framebuffer configuration unsupported!");
        }
        else {
            return {
                framebuffer: fb,
                textures: textures,
                depth: depthBuffer
            };
        }
        return null;
    };
    return glh;
}());
