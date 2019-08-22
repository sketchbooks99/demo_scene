(() => {
    let canvas;
    let canvasWidth;
    let canvasHeight;
    let gl;
    let ext;                    // WebGL の拡張機能を格納する
    let run;                    // WebGL の実行フラグ
    let qtn;                    // クォータニオン処理系クラス
    let mat;                    // 行列処理系クラス
    let textures = [];          
    let mouse = [0.0, 0.0];
    let isMouseDown = false;

    let lighting_shader;        // ライティング処理用のシェーダ
    let raymarch_shader;        // レイマーチングパス用のシェーダ

    const POSTEFFECT_BUFFER_INDEX = 1;

    window.addEventListener('load', () => {
        // canvas element を取得しサイズをウィンドウサイズに設定
        canvas = document.getElementById('canvas');
        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        gl = canvas.getContext('webgl');
        if(gl == null) {
            console.log('webgl unsupported');
            return;
        }
        mat = new matIV();

        // to be enable webgl extensions
        ext = getWebGLExtensions();

        mouse = [0, 0];
        // setting the event to be enable to stop running by ESC Key
        window.addEventListener('keydown', (eve) => {
            run = eve.keyCode !== 27;
        }, false);

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

        function loadCheck() {
            if(
                lighting_shader != null &&
                raymarch_shader != null && 
                true
            ) {init();}
        }

    }, false);

    function init() {
        lighting_shader.attLocation[0] = gl.getAttribLocation(lighting_shader.program, 'position');
        lighting_shader.attLocation[1] = gl.getAttribLocation(lighting_shader.program, 'normal');
        lighting_shader.attLocation[2] = gl.getAttribLocation(lighting_shader.program, 'color');

        lighting_shader.attStride[0] = 3;
        lighting_shader.attStride[1] = 3;
        lighting_shader.attStride[2] = 4;

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

        lighting_shader.uniLocation[0] = gl.getUniformLocation(lighting_shader.program, 'mvpMatrix');
        lighting_shader.uniLocation[1] = gl.getUniformLocation(lighting_shader.program, 'invMatrix');
        lighting_shader.uniLocation[2] = gl.getUniformLocation(lighting_shader.program, 'lightDirection');

        raymarch_shader.attLocation[0] = gl.getAttribLocation(raymarch_shader.program, 'position');
        raymarch_shader.attStride[0] = 3;
        raymarch_shader.uniLocation[0] = gl.getUniformLocation(raymarch_shader.program, 'time');
        raymarch_shader.uniLocation[1] = gl.getUniformLocation(raymarch_shader.program, 'mouse');
        raymarch_shader.uniLocation[2] = gl.getUniformLocation(raymarch_shader.program, 'resolution');
        raymarch_shader.uniType[0]     = 'uniform1f';
        raymarch_shader.uniType[1]     = 'uniform2fv';
        raymarch_shader.uniType[2]     = 'uniform2fv';

        // minMatrix.jsを用いた行列関連処理
        let m = new matIV();
        let mMatrix = m.identity(m.create());
        let vMatrix = m.identity(m.create());
        let pMatrix = m.identity(m.create());
        let tmpMatrix = m.identity(m.create());
        let mvpMatrix = m.identity(m.create());
        let invMatrix = m.identity(m.create());

        m.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], vMatrix);
        m.perspective(45, canvas.width / canvas.height, 0.1, 100, pMatrix);
        m.multiply(pMatrix, vMatrix, tmpMatrix);

        // frame buffer
        let postEffectBuffers = [
            createFramebufferFloat(ext, canvasWidth, canvasHeight),
            createFramebufferFloat(ext, canvasWidth, canvasHeight)
        ];

        let lightDirection = [-0.5, 0.5, 0.5];

        let count = 0;

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);

        gl.bindBuffer(gl.ARRAY_BUFFER, planeVBO);
        gl.enableVertexAttribArray(raymarch_shader.attLocation[0]);
        gl.vertexAttribPointer(raymarch_shader.attLocation[0], 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIBO);

        let startTime = Date.now();
        let nowTime = 0;
        run = true;
        render();

        // 恒常ループ
        function render() {
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            gl.clearDepth(1.0);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

            nowTime = (Date.now() - startTime) * 0.001;

            // let rad = (count % 360) * Math.PI / 180;

            // m.identity(mMatrix);
            // m.rotate(mMatrix, rad, [0, 1, 0.8], mMatrix);
            // m.multiply(tmpMatrix, mMatrix, mvpMatrix);

            // m.inverse(mMatrix, invMatrix);
            // gl.uniformMatrix4fv(lighting_shader.uniLocation[0], false, mvpMatrix);
            // gl.uniformMatrix4fv(lighting_shader.uniLocation[1], false, invMatrix);
            // gl.uniform3fv(lighting_shader.uniLocation[2], lightDirection);

            gl[raymarch_shader.uniType[0]](raymarch_shader.uniLocation[0], nowTime);
            gl[raymarch_shader.uniType[1]](raymarch_shader.uniLocation[1], mouse);
            gl[raymarch_shader.uniType[2]](raymarch_shader.uniLocation[2], [canvasWidth, canvasHeight]);

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
     * シェーダオブジェクトを生成して返す
     * コンパイルに失敗した場合は理由をアラートし null を返す。
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
     * プログラムオブジェクトを生成して返す。
     * シェーダのリンクに失敗した場合は利用をアラートし null を返す
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
     * VBO を生成して返す。
     * @param {Array} data - 頂点属性データを格納した配列
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
     * IBO を生成して返す
     * @param {Array} data - インデックスデータを格納した配列
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
     * IBO を生成して返す（INT 拡張版）
     * @param {Array} data - インデックスデータを格納した配列
     * @return {WebGLBuffer} IBO
     */
    function createIboInt(data) {
        let ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(data), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        return ibo;
    }

    function torus(row, column, irad, orad) {
        let pos = new Array(), nor = new Array(), 
            col = new Array(), idx = new Array();
        for(let i=0; i<=row; i++) {
            let r = Math.PI * 2 / row * i;
            let rr = Math.cos(r);
            let ry = Math.sin(r);
            for(let j = 0; j <= column; j++) {
                let tr = Math.PI * 2 / column * j;
                let tx = (rr * irad + orad) * Math.cos(tr);
                let ty = ry * irad;
                let tz = (rr * irad + orad) * Math.sin(tr);
                let rx = rr * Math.cos(tr);
                let rz = rr * Math.sin(tr);
                pos.push(tx, ty, tz);
                nor.push(rx, ry, rz);
                let tc = hsva(360 / column * j, 1, 1, 1);
                col.push(tc[0], tc[1], tc[2], tc[3]);
            }
        }
        for(i = 0; i < row; i++) {
            for(j = 0; j < column; j++) {
                r = (column + 1) * i + j;
                idx.push(r, r + column + 1, r + 1);
                idx.push(r + column + 1, r + column + 2, r + 1);
            }
        }
        return [pos, nor, col, idx];
    }

    function hsva(h, s, v, a) {
        if(s > 1 || v > 1 || a > 1) { return; }
        let th = h % 360;
        let i = Math.floor(th / 60);
        let f = th / 60 - i;
        let m = v * (1 - s);
        let n = v * (1 - s * f);
        let k = v * (1 - s * (1-f));
        let color = new Array();
        if(!s > 0 && !s < 0) {
            color.push(v, v, v, a);
        } else  {
            let r = new Array(v, n, m, m, k, v);
            let g = new Array(k, v, v, n, m, m);
            let b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }
        return color;
    }

    /**
     * XHR でシェーダのソースコードを外部ファイルから取得しコールバックを呼ぶ
     * @param {string} vsPath - 頂点シェーダの記述されたファイルのパス 
     * @param {*} fsPath - フラグメントシェーダの記述されたファイルパス
     * @param {*} callback - コールバック関数
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
     * @param {Array} vbo - VBOを格納した配列
     * @param {Array} attL - attribute location を格納した配列
     * @param {Array} attS - attribute stride を格納した配列
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
     * フレームバッファを生成して返す
     * @param {number} width - フレームバッファの幅
     * @param {number} height - フレームバッファの高さ 
     * @return {object} 生成した各種オブジェクトはラップして返却する
     * @property {WebGLFramebuffer} framebuffer - フレームバッファ
     * @property {WebGLRenderbuffer} renderbuffer - 深度バッファとして設定したレンダーバッファ
     * @property {WebGLTexture} texture - カラーバッファとして設定したテクスチャ
     */
    function createFramebuffer(width, height) {
        let frameBuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        let depthRenderBuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height); // 深度バッファ
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
        let fTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, fTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSINGED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return {framebuffer: frameBuffer, renderbuffer: depthRenderBuffer, texture: fTexture};
    }

    /**
     * フレームバッファを生成して返す。（フロートテクスチャ版）
     * @param {object} ext - getWebGLExtensions の戻り値
     * @param {number} width - フレームバッファの値
     * @param {number} height - フレームバッファの高さ
     * @return {object} 生成した各種オブジェクトはラップして返却する
     * @property {WebGLFramebuffer} framebuffer - フレームバッファ
     * @property {WebGLTexture} texture - カラーバッファとして設定したテクスチャ
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
     * @return {object} 取得した拡張機能
     * @property {object} elementIndexUint - Uint32 フォーマットを利用できるようにする
     * @property {object} textureFloat - フロートテクスチャを利用できるようにする
     * @property {object} textureHalfFloat - ハーフフロートテクスチャを利用できるようにする
     */
    function getWebGLExtensions(){
        return {
            elementIndexUint: gl.getExtension('OES_element_index_uint'),
            textureFloat:     gl.getExtension('OES_texture_float'),
            textureHalfFloat: gl.getExtension('OES_texture_half_float')
        };
    }
})();