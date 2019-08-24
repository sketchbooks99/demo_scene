(() => {
    let canvas;
    let canvasWidth;
    let canvasHeight;
    let gl;
    let ext;                    // Extension of WebGL
    let run;                    // Execution Flag of WebGL
    let qtn;                    // class of processing quaternion
    let mat;                    // class of processing matrix
    let camera;                 
    let textures = [];          
    let mouse = [0.0, 0.0];
    let isMouseDown = false;
    let startTime;
    let nowTime;

    let lighting_shader;        // shader of lighting pass
    let raymarch_shader;        // shader of raymarching pass
    let post_shader;            // shader of postprocessing pass

    const POSTEFFECT_BUFFER_INDEX = 1;
    const POINT_RESOLUTION = 256;

    window.addEventListener('load', () => {
        // get SIZE of Canvas element to setting Window Size this parameter
        canvas = document.getElementById('canvas');
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        // Init WebGL Context
        gl = canvas.getContext('webgl');
        if(gl == null) {
            console.log('webgl unsupported');
            return;
        }

        // init various variable
        mat = new matIV();
        qtn = new qtnIV();
        camera = new InteractionCamera();
        camera.update();

        // to be enable webgl extensions
        ext = getWebGLExtensions();

        mouse = [0, 0];
        // setting the event to be enable to stop running by ESC Key
        window.addEventListener('keydown', (eve) => {
            run = eve.keyCode !== 27;
        }, false);

        // Registration of event which is relative with Mouse
        canvas.addEventListener('mousedown', camera.startEvent, false);
        canvas.addEventListener('mousemove', camera.moveEvent, false);
        canvas.addEventListener('mouseup', camera.eneEvent, false);
        canvas.addEventListener('wheel', camera.wheelEvent, false);

        window.addEventListener('mousemove', (eve) => {
            if(isMouseDown !== true) { return; }
            let x = (eve.clientX / canvasWidth) * 2.0 - 1.0;
            let y = (eve.clientY / canvasHeight) * 2.0 - 1.0;
            mouse = [x, -y];
        }, false);

        loadShaderSource(
            'shader/shader.vert', 
            'shader/shader.frag',
            (shader) => {
                let vs = createShader(shader.vs, gl.VERTEX_SHADER);
                let fs = createShader(shader.fs, gl.FRAGMENT_SHADER);
                let prg = createProgram(vs, fs);
                if(prg == null) { return; }
                lighting_shader = new ProgramParameter(prg);
                loadCheck();
            }
        );
        
        loadShaderSource(
            'shader/raymarch.vert',
            'shader/raymarch.frag',
            (shader) => {
                let vs = createShader(shader.vs, gl.VERTEX_SHADER);
                let fs = createShader(shader.fs, gl.FRAGMENT_SHADER);
                let prg = createProgram(vs, fs);
                if(prg == null) { return; }
                raymarch_shader = new ProgramParameter(prg);
                loadCheck();
            }
        );

        loadShaderSource(
            'shader/post.vert',
            'shader/post.frag',
            (shader) => {
                let vs = createShader(shader.vs, gl.VERTEX_SHADER);
                let fs = createShader(shader.fs, gl.FRAGMENT_SHADER);
                let prg = createProgram(vs, fs);
                if(prg == null) { return; }
                post_shader = new ProgramParameter(prg);
                loadCheck();
            }
        );

        function loadCheck() {
            if(
                lighting_shader != null &&
                raymarch_shader != null && 
                post_shader     != null &&
                true
            ) {init();}
        }

    }, false);

    function init() {
        // Setting of lighting pass
        lighting_shader.attLocation[0] = gl.getAttribLocation(lighting_shader.program, 'position');
        lighting_shader.attLocation[1] = gl.getAttribLocation(lighting_shader.program, 'normal');
        lighting_shader.attLocation[2] = gl.getAttribLocation(lighting_shader.program, 'color');
        lighting_shader.attStride[0] = 3;
        lighting_shader.attStride[1] = 3;
        lighting_shader.attStride[2] = 4;
        lighting_shader.uniLocation[0] = gl.getUniformLocation(lighting_shader.program, 'mvpMatrix');
        lighting_shader.uniLocation[1] = gl.getUniformLocation(lighting_shader.program, 'invMatrix');
        lighting_shader.uniLocation[2] = gl.getUniformLocation(lighting_shader.program, 'lightDirection');
        lighting_shader.uniType[0] = 'uniformMatrix4fv';
        lighting_shader.uniType[1] = 'uniformMatrix4fv';
        lighting_shader.uniType[2] = 'uniform3fv';

        // Setting of raymarch pass
        raymarch_shader.attLocation[0] = gl.getAttribLocation(raymarch_shader.program, 'position');
        raymarch_shader.attLocation[1] = gl.getAttribLocation(raymarch_shader.program, 'texcoord');
        raymarch_shader.attStride[0] = 3;
        raymarch_shader.attStride[1] = 2;
        raymarch_shader.uniLocation[0] = gl.getUniformLocation(raymarch_shader.program, 'time');
        raymarch_shader.uniLocation[1] = gl.getUniformLocation(raymarch_shader.program, 'mouse');
        raymarch_shader.uniLocation[2] = gl.getUniformLocation(raymarch_shader.program, 'resolution');
        raymarch_shader.uniLocation[3] = gl.getUniformLocation(raymarch_shader.program, 'mvpMatrix');
        raymarch_shader.uniType[0]     = 'uniform1f';
        raymarch_shader.uniType[1]     = 'uniform2fv';
        raymarch_shader.uniType[2]     = 'uniform2fv';
        raymarch_shader.uniType[3]     = 'uniformMatrix4fv';

        // Setting of postProcessing pass
        post_shader.attLocation[0] = gl.getAttribLocation(post_shader.program, 'position');
        post_shader.attLocation[1] = gl.getAttribLocation(post_shader.program, 'texcoord');
        post_shader.attStride[0] = 3;
        post_shader.attStride[1] = 2;
        post_shader.uniLocation[0] = gl.getUniformLocation(post_shader.program, 'time');
        post_shader.uniLocation[1] = gl.getUniformLocation(post_shader.program, 'sceneTex');
        post_shader.uniLocation[2] = gl.getUniformLocation(post_shader.program, 'resolution');
        post_shader.uniType[0] = 'uniform1f';
        post_shader.uniType[1] = 'uniform1i';
        post_shader.uniType[2] = 'uniform2fv';

        // let torus_data = torus(32, 32, 1.0, 2.0);
        // let position = torus_data[0];
        // let normal = torus_data[1];
        // let color = torus_data[2];
        // let index = torus_data[3];



        let planePosition = [
            1.0, 1.0, 0.0,
            -1.0, 1.0, 0.0, 
            1.0, -1.0, 0.0,
            -1.0, -1.0, 0.0
        ];
        let planeTexCoord = [
            1.0, 0.0,
            0.0, 0.0, 
            1.0, 1.0, 
            0.0, 1.0
        ];
        let planeIndex = [
            0, 1, 2, 2, 1, 3
        ];
        let planeVBO = createVbo(planePosition);
        let planeIBO = createIbo(planeIndex);
        let planeTexCoordVBO = [
            createVbo(planePosition),
            createVbo(planeTexCoord)
        ];

        // let pos_vbo = create_vbo(position);
        // let nor_vbo = create_vbo(normal);
        // let col_vbo = create_vbo(color);

        // let ibo = create_ibo(index);

        // setAttribute([pos_vbo, nor_vbo, col_vbo], lighting_shader.attLocation, lighting_shader.attStride, ibo);

        // minMatrix.jsを用いた行列関連処理
        // Matrix processing using "minMatrix.js"
        let mMatrix     = mat.identity(mat.create());
        let vMatrix     = mat.identity(mat.create());
        let pMatrix     = mat.identity(mat.create());
        let vpMatrix    = mat.identity(mat.create());
        let tmpMatrix   = mat.identity(mat.create());
        let qtnMatrix   = mat.identity(mat.create());
        let mvpMatrix   = mat.identity(mat.create());
        let invMatrix   = mat.identity(mat.create());

        mat.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], vMatrix);
        mat.perspective(45, canvas.width / canvas.height, 0.1, 100, pMatrix);
        mat.multiply(pMatrix, vMatrix, tmpMatrix);

        let lightDirection = [-0.5, 0.5, 0.5];

        let count = 0;

        gl.clearColor(0.7, 0.7, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);   

        gl.bindBuffer(gl.ARRAY_BUFFER, planeVBO);
        gl.enableVertexAttribArray(raymarch_shader.attLocation[0]);
        gl.vertexAttribPointer(raymarch_shader.attLocation[0], 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIBO);

        // frame buffer
        let frameBuffer = createFramebuffer(canvasWidth, canvasHeight);
        // To bind texture is framebuffer
        gl.bindTexture(gl.TEXTURE_2D, frameBuffer.texture);

        startTime = Date.now();
        nowTime = 0;
        run = true;
        render();

        // Infinite loop
        function render() {

            canvasWidth     = window.innerWidth;
            canvasHeight    = window.innerHeight;
            canvas.width    = canvasWidth;
            canvas.height   = canvasHeight;

            // At the first, Burn the Scene to frameBuffer
            // bind of frameBuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer.framebuffer);
            gl.useProgram(raymarch_shader.program);

            // setting viewport and clearing imformation of color and depth
            gl.viewport(0, 0, canvasWidth, canvasHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            // parameter of camera
            let cameraPosition      = [0.0, 0.0, 3.0];
            let centerPoint         = [0.0, 0.0, 0.0];
            let cameraUpDirection   = [0.0, 1.0, 0.0];
            let fovy    = 60 * camera.scale;
            let aspect  = canvasWidth / canvasHeight;
            let near    = 0.1;
            let far     = 10.0;

            nowTime = (Date.now() - startTime) * 0.001;

            // View Projection Matrix
            mat.lookAt(cameraPosition, centerPoint, cameraUpDirection, vMatrix);
            mat.perspective(fovy, aspect, near, far, pMatrix);
            mat.multiply(pMatrix, vMatrix, vpMatrix);
            camera.update();
            mat.identity(qtnMatrix);
            qtn.toMatIV(camera.qtn, qtnMatrix);
            mat.multiply(vpMatrix, qtnMatrix, vpMatrix);

            // // To be enable IBO and VBO to render for Framebuffer
            setAttribute(planeVBO, raymarch_shader.attLocation, raymarch_shader.attStride, planeIBO);
            mat.identity(mMatrix);
            mat.rotate(mMatrix, nowTime * 0.1, [0.0, 1.0, 0.0], mMatrix);
            mat.multiply(vpMatrix, mMatrix, mvpMatrix);
            gl[raymarch_shader.uniType[0]](raymarch_shader.uniLocation[0], nowTime);
            gl[raymarch_shader.uniType[1]](raymarch_shader.uniLocation[1], mouse);
            gl[raymarch_shader.uniType[2]](raymarch_shader.uniLocation[2], [canvasWidth, canvasHeight]);
            gl[raymarch_shader.uniType[3]](raymarch_shader.uniLocation[3], false, mvpMatrix);
            gl.drawElements(gl.TRIANGLES, planeIndex.length, gl.UNSIGNED_SHORT, 0);

            // End to render framebuffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            // Change Program Object
            gl.useProgram(post_shader.program);
            // Clear the Scene
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            // Enable VBO for Postprocessing
            setAttribute(planeVBO, post_shader.attLocation, post_shader.attStride, planeIBO);
            // Push uniform variable
            gl[post_shader.uniType[0]](post_shader.uniLocation[0], nowTime);
            gl[post_shader.uniType[1]](post_shader.uniLocation[1], frameBuffer.texture);
            gl[post_shader.uniType[2]](post_shader.uniLocation[2], [canvasWidth, canvasHeight]);

            gl.drawElements(gl.TRIANGLES, planeIndex.length, gl.UNSIGNED_SHORT, 0);

            gl.flush();

            if(run) { requestAnimationFrame(render); }
        }
    }

    // utility
    /**
     * @class
     */
    class InteractionCamera {
        /**
         * @constructor
         */
        constructor() {
            this.qtn = qtn.identity(qtn.create());
            this.dragging = false;
            this.prevMouse = [0, 0];
            this.rotationScale = Math.min(window.innerWidth, window.innerHeight);
            this.rotation = 0.0;
            this.rotateAxis = [0.0, 0.0, 0.0];
            this.rotatePower = 1.5;
            this.rotateAttenuation = 0.9;
            this.scale = 1.0;
            this.scalePower = 0.0;
            this.scaleAttenuation = 0.8;
            this.scaleMin = 0.5;
            this.scaleMax = 1.5;
            this.startEvent = this.startEvent.bind(this);
            this.moveEvent = this.moveEvent.bind(this);
            this.endEvent = this.endEvent.bind(this);
            this.wheelEvent = this.wheelEvent.bind(this);
        }

        /**
         * mouse down event
         * @param {Event} eve - event object
         */
        startEvent(eve) {
            this.dragging = true;
            this.prevMoues = [eve.clientX, eve.clientY];
        }

        /**
         * mouse move event
         * @param {Event} eve - event object
         */
        moveEvent(eve) {
            if(this.dragging !== true) { return ; }
            let x = this.prevMouse[0] - eve.clientX;
            let y = this.prevMouse[1] - eve.clientY;
            this.rotation = Math.sqrt(x * x + y * y) / this.rotationScale * this.rotatePower;
            this.rotationAxis[0] = y;
            this.rotationAxis[1] = x;
            this.prevMouse = [eve.clientX, eve.clientY];
        }

        /**
         * mouse up event
         */
        endEvent() {
            this.dragging = false;
        }

        /**
         * wheel event
         * @param {Event} eve - event object
         */
        wheelEvent(eve) {
            let w = eve.wheelDelta;
            if(w > 0) {
                this.scalePower = -0.05;
            } else if(w < 0) {
                this.scalePower = 0.05;
            }
        }

        /**
         * quaternion update
         */
        update() {
            this.scalePower *= this.scaleAttenuation;
            this.scale = Math.max(this.scaleMin, Math.min(this.scaleMax, this.scale + this.scalePower));
            if(this.rotation === 0.0) { return; }
            this.rotation *= this.rotateAttenuation;
            let q = qtn.identity(qtn.create());
            qtn.rotate
        }
    }

    class ProgramParameter {
        constructor(program) {
            this.program = program;
            this.attLocation = [];
            this.attStride = [];
            this.uniLocation = [];
            this.uniType = [];
        }
    }

    function createTexture(source, callback) {
        let img = new Image();
        img.addEventListener('load', () => {
            let tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.bindTexture(gl.TEXTURE_2D, null);
            callback(tex);
        }, false);
        img.src = source;
    }

    /**
     * creating SHADER Object and return this
     * when failed to compile, to alert reason and return "null"
     * @param {*} source - シェーダのソースコード文字列
     * @param {*} type - gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
     * @return {WebGLShader} シェーダオブジェクト
     */
    function createShader(source, type) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(gl.getShaderInfoLog(shader));
            return null;
        }
    }
    
    /**
     * creating SHADER Object and return "this"
     * when failed to compile, to alert reason and return "null"
     * @param {WebGLShader} vs 
     * @param {WebGLShader} fs
     * @return {WebGLProgram} プログラムオブジェクト 
     */
    function createProgram(vs, fs) {
        if(vs == null || fs == null) { return; }
        let program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if(gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);
            return program;
        } else {
            alert(gl.getProgramInfoLog(program));
            return null;
        }
    }
    
    /**
     * create VBO and return this
     * @param {Array} data - The Array storing Vertex data
     * @return {WebGLBuffer} VBO 
     */
    function createVbo(data) {
        let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);  
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        return vbo;
    }

    /**
     * create IBO and return this
     * @param {Array} data - The Array Storing Index data
     * @return {WebGLBuffer} - IBO
     */
    function createIbo(data) {
        let ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    /**
     * create IBO and return this（version of Extension INT）
     * @param {Array} data - The Array Storing Index data
     * @return {WebGLBuffer} IBO
     */
    function createIboInt(data) {
        let ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    /** 
     * To CALL "callback" to GET "shader source code" from Outside using XHR
     * @param {string} vsPath - filePath of Vertex shader
     * @param {*} fsPath - filePath of Fragment Shader
     * @param {*} callback - Callback Function
     */
    function loadShaderSource(vsPath, fsPath, callback) {
        let vs, fs;
        xhr(vsPath, true);
        xhr(fsPath, false);
        function xhr(source, isVertex) {
            let xml = new XMLHttpRequest();
            xml.open('GET', source, true);
            xml.setRequestHeader('Pragma', 'no-cache');
            xml.setRequestHeader('Cache-Control', 'no-cache');
            xml.onload = () => {
                if(isVertex) {
                    vs = xml.responseText;
                } else {
                    fs = xml.responseText;
                }
                if(vs != null && fs != null) {
                    console.log('loaded', vsPath, fsPath);
                    callback({vs: vs, fs: fs});
                }
            };
            xml.send();
        }
    }

    /**
     * @param {Array} vbo - Array storing Vertex data
     * @param {Array} attL - Array storing "attribute location"
     * @param {Array} attS - Array storing "attribute stride"
     * @param {WebGLBuffer} ibo - IBO
     */
    function setAttribute(vbo, attL, attS, ibo) {
        for(let i in vbo) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(attL[i]);
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
        if(ibo != null) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        }
    }

    /**
     *  CREATE Framebuffer and RETURN this
     * @param {number} width - WIDTH of Framebuffer
     * @param {number} height - HEIGHT of Framebuffer 
     * @return {object} Return various Object with Wrapping
     * @property {WebGLFramebuffer} framebuffer - Framebuffer
     * @property {WebGLRenderbuffer} renderbuffer - Renderbuffer setted as Depthbuffer
     * @property {WebGLTexture} texture - Texture setted as Colorbuffer
     */
    function createFramebuffer(width, height){
        let frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        let depthRenderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
        let fTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return {framebuffer: frameBuffer, renderbuffer: depthRenderBuffer, texture: fTexture};
    }

    /**
     * CREATE and RETUEN Framebuffer (Float Texture version)
     * @param {object} ext - RETURN Value of getWebGLExtensions 
     * @param {number} width - WIDTH of Framebuffer
     * @param {number} height - HEIGHT of Framebuffer
     * @return {object} Return various Object with Wrapping
     * @property {WebGLFramebuffer} framebuffer - Framebuffer
     * @property {WebGLTexture} texture - Texture setted as Colorbuffer
     */
    function createFramebufferFloat(ext, width, height) {
        if(ext == null || (ext.textureFloat == null && ext.textureHalfFloat == null)) {
            console.log('float texture not support');
            return;
        }
        let flg = (ext.textureFloat != null) ? gl.FLOAT : ext.textureHalfFloat.HALF_FLOAT_OES;
        let frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        let fTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, flg, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATRACHMENT0, gl.TEXTURE_2D, fTexture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return {framebuffer: frameBuffer, texture: fTexture};
    }

    /**
     * @return {object} Extension Function have been got
     * @property {object} elementIndexUint - To be able to use "Uint32" format
     * @property {object} textureFloat - To be able to use Float Texture
     * @property {object} textureHalfFloat - To be able to use Half Float Texture
     */
    function getWebGLExtensions(){
        return {
            elementIndexUint: gl.getExtension('OES_element_index_uint'),
            textureFloat:     gl.getExtension('OES_texture_float'),
            textureHalfFloat: gl.getExtension('OES_texture_half_float')
        };
    }
})();