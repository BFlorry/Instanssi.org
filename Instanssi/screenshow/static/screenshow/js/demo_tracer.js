/// <reference path="math.ts"/>
/// <reference path="glhelpers.ts"/>
/**
 * This is basically an effect factory that registers itself
 * so that it can be called by the Screenshow effects manager.
 */
$(function () {
    'use strict';
    function tracer(canvas, gl, R) {
        console.assert(gl.getExtension('OES_texture_float'));
        var glExtHF = gl.getExtension('OES_texture_half_float');
        console.assert(glExtHF);
        if (!gl.getExtension('OES_texture_float_linear')) {
            console.info('No float texture filtering support!');
        }
        console.info('max texture size: ' + gl.getParameter(gl.MAX_TEXTURE_SIZE));
        // do init stuff here
        // try to not alter the resources too much as they might be shared
        var t = 0;
        var textures = {};
        var shaders = {};
        var buffers = {};
        var framebuffers = {};
        textures.test = createTextureFromImage(R.images.test);
        framebuffers.traced = glh.createRenderTarget(gl, canvas.width, canvas.height);
        framebuffers.postA = glh.createRenderTarget(gl, canvas.width, canvas.height);
        framebuffers.postB = glh.createRenderTarget(gl, canvas.width, canvas.height);
        // for now, just use the same image
        textures.cube = createCubeMapFromImages(R.images.negx, R.images.negy, R.images.negz, R.images.posx, R.images.posy, R.images.posz);
        shaders.trace = glh.buildShaderProgram(gl, R.strings.passthroughVertex, R.strings.tracerFragment);
        /*
        var glExtDS = gl.getExtension('WEBGL_debug_shaders');
        if(glExtDS) {
            var tmpShader = buildShader(gl, gl.FRAGMENT_SHADER, srcFragment);
            var src = glExtDS.getTranslatedShaderSource(tmpShader);
            console.info(src);
        }*/
        glh.getShaderUniform(gl, shaders.trace, 'ufCameraPos', 'cameraPos');
        glh.getShaderUniform(gl, shaders.trace, 'ufCameraMotion', 'cameraMotion');
        glh.getShaderUniform(gl, shaders.trace, 'ufCameraParams', 'cameraParams');
        glh.getShaderUniform(gl, shaders.trace, 'ufTime', 'time');
        glh.getShaderUniform(gl, shaders.trace, 'ufBackgroundAlpha', 'backgroundAlpha');
        glh.getShaderUniform(gl, shaders.trace, 'ufCameraQuat', 'cameraQuat');
        glh.getShaderUniform(gl, shaders.trace, 'ufCameraQuatPrev', 'cameraQuatPrev');
        glh.getShaderUniform(gl, shaders.trace, 'ufLightDir', 'lightDir');
        glh.getShaderUniform(gl, shaders.trace, 'ufLightColor', 'lightColor');
        glh.getShaderUniform(gl, shaders.trace, 'ufAmbientTop', 'ambientTop');
        glh.getShaderUniform(gl, shaders.trace, 'ufAmbientCenter', 'ambientCenter');
        glh.getShaderUniform(gl, shaders.trace, 'ufAmbientBottom', 'ambientBottom');
        glh.bindSampler(gl, shaders.trace, 'smpSceneData0', 0);
        glh.bindSampler(gl, shaders.trace, 'smpSceneData1', 1);
        glh.bindSampler(gl, shaders.trace, 'smpCube', 2);
        shaders.linearBlur = glh.buildShaderProgram(gl, R.strings.passthroughVertex, R.strings.linearblurFragment);
        glh.bindSampler(gl, shaders.linearBlur, 'smpImage', 0);
        glh.getShaderUniform(gl, shaders.linearBlur, 'ufDir', 'dir');
        shaders.composite = glh.buildShaderProgram(gl, R.strings.passthroughVertex, R.strings.compositeFragment);
        glh.bindSampler(gl, shaders.composite, 'smpImage', 0);
        glh.bindSampler(gl, shaders.composite, 'smpBlurred', 1);
        var rawRectVertices = [
            1, 1, 0,
            -1, 1, 0,
            -1, -1, 0,
            1, 1, 0,
            -1, -1, 0,
            1, -1, 0,
        ];
        buffers.rect = glh.createVertexBuffer(gl, rawRectVertices);
        textures.sceneData = [];
        var sceneDataBuffers = [];
        var currentSceneBuffer = 0;
        function createSceneBuffer() {
            var tex = gl.createTexture();
            var buf = new Float32Array(2048 * 4);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2048, 1, 0, gl.RGBA, gl.FLOAT, null);
            textures.sceneData.push(tex);
            sceneDataBuffers.push(buf);
        }
        createSceneBuffer();
        createSceneBuffer();
        updateSceneBuffer(0, 0);
        function updateSceneBuffer(t, num) {
            var sceneTokens = { NONE: 0, SPHERE: 1, POLYHEDRON: 2, BOUNDING_VOLUME: 3 };
            var offset = 0;
            var buffer = sceneDataBuffers[num];
            var texture = textures.sceneData[num];
            var M_PI2 = Math.PI * 2;
            buffer.fill(0);
            // NOTE: when writing stuff, pad items to multiples of 4.
            // The interpreter expects items to start at next RGBA.
            // Generates a sphere with a given location, radius and color.
            function writeSphere(pos, radius, color) {
                buffer[offset + 0] = sceneTokens.SPHERE;
                buffer[offset + 1] = pos.x;
                buffer[offset + 2] = pos.y;
                buffer[offset + 3] = pos.z;
                buffer[offset + 4] = radius;
                buffer[offset + 5] = color.x;
                buffer[offset + 6] = color.y;
                buffer[offset + 7] = color.z;
                offset += 8;
            }
            // Generates a signal for end-of-buffer.
            function writeNull() {
                // TODO: Do we need this when we fill the buffer with 0 anyways?
                buffer[offset + 0] = 0;
                offset += 4;
            }
            // Generates a polyhedron defined by N planes and a material (color).
            function writePolyhedron(planes) {
                // TODO: Implement me!
                buffer[offset + 0] = sceneTokens.POLYHEDRON;
                buffer[offset + 1] = planes.length;
                buffer[offset + 2] = 0;
                buffer[offset + 3] = 0;
                offset += 4;
                for (var i = 0; i < planes.length; i++) {
                    var p = planes[i];
                    buffer[offset + 0] = p.x;
                    buffer[offset + 1] = p.y;
                    buffer[offset + 2] = p.z;
                    buffer[offset + 3] = p.w;
                    offset += 4;
                }
            }
            function writePlane(plane) {
                buffer[offset + 0] = sceneTokens.POLYHEDRON;
                buffer[offset + 1] = 1; // 1 plane
                buffer[offset + 2] = 0;
                buffer[offset + 3] = 0;
                buffer[offset + 4] = plane.x;
                buffer[offset + 5] = plane.y;
                buffer[offset + 6] = plane.z;
                buffer[offset + 7] = plane.w;
                offset += 8;
            }
            // Generates an instruction that orders that the ray skip to some
            // location in the source code if testing against a volume fails.
            // Used to implement bounding volume hierarchies.
            function writeVolume(center, radius, length) {
                // TODO: Potential optimization: Skip writing bounding volumes
                // if they would cover too much of the screen.
                // It's much cheaper to test here than in the shader.
                // - What about reflections and shadows?
                //   - Use one of the unused components to indicate the volume
                //     is only for use with those?
                buffer[offset + 0] = sceneTokens.BOUNDING_VOLUME;
                buffer[offset + 1] = 2 + length; // offset step in RGBAs, including this (2)
                buffer[offset + 2] = 0;
                buffer[offset + 3] = 0;
                buffer[offset + 4] = center.x;
                buffer[offset + 5] = center.y;
                buffer[offset + 6] = center.z;
                buffer[offset + 7] = radius;
                // TODO: Could this instead declare a binary split via a plane?
                // It's easier to test against; if ray passed through plane
                // or starts on the right side of it, we don't skip.
                offset += 8;
            }
            // TODO: Animate polyhedron planes to implement weird metametal shit
            function Plane(x, y, z, w) {
                var vec = new Vec3(x, y, z).unit();
                // EVIL HACK: stash in quaternion because we have no Vec4
                return new Quat(x, y, z, w);
            }
            writePlane(Plane(0, 1, 0, 40));
            /*
            writePlane(Plane(1, 1, 0, 40));
            writePlane(Plane(-1, 1, 0, 40));*/
            /*writePolyhedron([
              // Plane(1, 2, 0, 140),
              // Plane(-1, 2, 0, 140)
              Plane(0, 1, 0, 100),
            ]);*/
            /*
            writeSphere(new Vec3(0.0, -45.0, -100.0), 40.0, new Vec3(0.5));
            writeSphere(new Vec3(0.0, Math.sin(4.0 * t) * 10.0 - 10.0, -100.0), 2.0, new Vec3(1.0, 0.25, 1.0));*/
            var sphereColors = [
                toLinear3(new Vec3(1.0, 0.25, 0.06)),
                toLinear3(new Vec3(0.06, 1.0, 0.25)),
                toLinear3(new Vec3(0.06, 0.25, 1.0)),
            ];
            function getSpherePos(t, offset, rad, count) {
                t *= 0.1;
                t += offset / count * M_PI2;
                return new Vec3(Math.sin(t) * rad, -10, -100 + Math.cos(t) * rad);
            }
            function makeSphereCircle(t, count, radius) {
                writeVolume(new Vec3(0, -10, -100), radius + 4.0, 2 * count);
                var i, pos;
                for (i = 0; i < count; i++) {
                    pos = getSpherePos(t, i, radius, count);
                    writeSphere(pos, 4.0, sphereColors[i % sphereColors.length]);
                }
            }
            makeSphereCircle(t * 2, 10, 80);
            // the interpreter terminates when it sees this
            writeNull();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 2048, 1, gl.RGBA, gl.FLOAT, buffer);
        }
        var lastCameraPos = new Vec3(0);
        var lastCameraQuat = new Quat();
        // this function is called when the effect should render itself
        function run(dt, isNear, demoGlobals) {
            var aspect = demoGlobals.aspect || (16 / 9);
            if (!demoGlobals.paused) {
                t += dt;
            }
            // TODO: Use data about party lighting to render an envmap
            // that can be used to light the scene?
            var cpos = demoGlobals.cameraPos || new Vec3(0, -2, 0);
            var cq = demoGlobals.cameraQuat || new Quat();
            var lcq = lastCameraQuat;
            lastCameraQuat = cq;
            var focusDistance = 80;
            var cutoff = focusDistance;
            var near = isNear ? 0.0 : cutoff * 0.97;
            var far = isNear ? cutoff * 1.10 : 90000.0;
            gl.bindTexture(gl.TEXTURE_2D, null);
            // gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.traced.framebuffer);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.clearColor(0, 0, 0, 0.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            // gl.enable(gl.BLEND);
            gl.useProgram(shaders.trace.program);
            var cmot = cpos.sub(lastCameraPos);
            lastCameraPos = cpos;
            var shader = shaders.trace;
            var lightDir = new Vec3(1, 6, 0).unit();
            var lightColor = toLinear3(new Vec3(1.0, 0.98, 0.96));
            gl.uniform3f(shader.ufLightDir, lightDir.x, lightDir.y, lightDir.z);
            gl.uniform3f(shader.ufLightColor, lightColor.x, lightColor.y, lightColor.z);
            // TODO: Adjust these based on time-of-day?
            var ambientTop = new Vec3(0.03, 0.03, 0.06).mul(2.0);
            var ambientCenter = new Vec3(0.10, 0.12, 0.20).mul(2.0);
            var ambientBottom = new Vec3(0.10, 0.10, 0.10).mul(2.0);
            gl.uniform3f(shader.ufAmbientTop, ambientTop.x, ambientTop.y, ambientTop.z);
            gl.uniform3f(shader.ufAmbientCenter, ambientCenter.x, ambientCenter.y, ambientCenter.z);
            gl.uniform3f(shader.ufAmbientBottom, ambientBottom.x, ambientBottom.y, ambientBottom.z);
            gl.uniform4f(shader.ufCameraQuat, cq.x, cq.y, cq.z, cq.w);
            gl.uniform4f(shader.ufCameraQuatPrev, lcq.x, lcq.y, lcq.z, lcq.w);
            gl.uniform3f(shader.ufCameraPos, cpos.x, cpos.y, cpos.z);
            gl.uniform3f(shader.ufCameraMotion, cmot.x, cmot.y, cmot.z);
            gl.uniform4f(shader.ufCameraParams, near, far, aspect, focusDistance);
            gl.uniform1f(shader.ufTime, t);
            gl.uniform1f(shader.ufBackgroundAlpha, isNear ? 0.0 : 1.0);
            currentSceneBuffer = (currentSceneBuffer + 1) % 2;
            updateSceneBuffer(t, currentSceneBuffer);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures.sceneData[currentSceneBuffer]);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, textures.sceneData[(currentSceneBuffer + 1) % 2]);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, textures.cube);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.rect);
            gl.enableVertexAttribArray(0);
            gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            /*
            gl.disable(gl.BLEND);
            gl.activeTexture(gl.TEXTURE0);
      
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.postB.framebuffer);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.traced.textures[0]);
            gl.useProgram(shaders.linearBlur.program);
            gl.uniform2f(shaders.linearBlur.ufDir, 1.0 / canvas.width, 0.0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
      
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.postA.framebuffer);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.postB.textures[0]);
            gl.useProgram(shaders.linearBlur.program);
            gl.uniform2f(shaders.linearBlur.ufDir, 0.0, 1.0 / canvas.height);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
      
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.useProgram(shaders.composite.program);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.traced.textures[0]);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.postA.textures[0]);
            gl.drawArrays(gl.TRIANGLES, 0, 6);*/
        }
        /**
         * Creates a WebGL Texture object from a DOM image.
         * @note Also works with <video> elements.
         */
        function createTextureFromImage(img) {
            if (!img) {
                return null;
            }
            var tex = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // WebGL has two texImage2D functions; this variant gets width and height
            // from a DOM image element.
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.bindTexture(gl.TEXTURE_2D, null);
            return tex;
        }
        /**
         * Updates a WebGL Texture object from an image.
         * @note Also works with <video> elements.
         */
        function updateTextureFromImage(tex, img) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        }
        /**
         * Creates a WebGL cubemap texture from a single image, for testing.
         */
        function createCubeMapFromImage(img) {
            if (!img) {
                return null;
            }
            var tex = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            function cubeFace2D(target) {
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            }
            cubeFace2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            return tex;
        }
        /**
         * Creates a WebGL cubemap texture from a single image, for testing.
         */
        function createCubeMapFromImages(negx, negy, negz, posx, posy, posz) {
            var tex = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, tex);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            function cubeFace2D(target, img) {
                gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            }
            cubeFace2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X, posx);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_X, negx);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Y, posy);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, negy);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_POSITIVE_Z, posz);
            cubeFace2D(gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, negz);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
            return tex;
        }
        var invGamma = 1.0 / 2.2;
        function toLinear(x) { return Math.pow(x, invGamma); }
        function toLinear3(v) {
            return new Vec3(toLinear(v.x), toLinear(v.y), toLinear(v.z));
        }
        // this is so common we can just monkeypatch the GL API to support it.
        function uniform3fGammaToLinear(gl, name, x, y, z) {
            gl.uniform3f(name, toLinear(x), toLinear(y), toLinear(z));
        }
        ;
        function clearColorGammaToLinear(gl, r, g, b, a) {
            gl.clearColor(toLinear(r), toLinear(g), toLinear(b), a);
        }
        ;
        return run;
    } // tracer
    screenshowEffects.register({
        name: 'tracemarcher v0.01',
        author: 'tt',
        constructor: tracer,
        resources: {
            images: {
                test: 'normal.png',
                test2: 'test2.png',
                negx: 'yokohama/negx.jpg',
                negy: 'yokohama/negy.jpg',
                negz: 'yokohama/negz.jpg',
                posx: 'yokohama/posx.jpg',
                posy: 'yokohama/posy.jpg',
                posz: 'yokohama/posz.jpg',
            },
            strings: {
                passthroughVertex: 'passthrough.vertex.glsl',
                tracerFragment: 'tracer.fragment.glsl',
                linearblurFragment: 'linearblur.fragment.glsl',
                compositeFragment: 'composite.fragment.glsl'
            }
        },
    });
}); // module
