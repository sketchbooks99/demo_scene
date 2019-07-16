(() => {
    let lighting_shader;

    var c = document.getElementById('canvas');
    c.width = 500;
    c.height = 500;

    var gl = c.getContext('webgl') || c.getContext('experiment-webgl');

    loadShaderSource(
        'shader/shader.vert', 
        'shader/shader.frag',
        (shader) => {
            let vs = create_shader(shader.vs, gl.VERTEX_SHADER);
            let fs = create_shader(shader.fs, gl.FRAGMENT_SHADER);
            let prg = create_program(vs, fs);
            if(prg = null) { return; }
            lighting_shader = new ProgramParameter(prg);
        }
    )

    var attLocation = new Array();
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    attLocation[1] = gl.getAttribLocation(prg, 'normal');
    attLocation[2] = gl.getAttribLocation(prg, 'color');

    var attStride = new Array();
    attStride[0] = 3;
    attStride[1] = 3;
    attStride[2] = 4;

    var torus_data = torus(32, 32, 1.0, 2.0);
    var position = torus_data[0];
    var normal = torus_data[1];
    var color = torus_data[2];
    var index = torus_data[3];

    var pos_vbo = create_vbo(position);
    var nor_vbo = create_vbo(normal);
    var col_vbo = create_vbo(color);

    set_attribute([pos_vbo, nor_vbo, col_vbo], attLocation, attStride);

    var ibo = create_ibo(index);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    var uniLocation = new Array();
    uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
    uniLocation[1] = gl.getUniformLocation(prg, 'invMatrix');
    uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');

    // minMatrix.jsを用いた行列関連処理
    var m = new matIV();

    var mMatrix = m.identity(m.create());
    var vMatrix = m.identity(m.create());
    var pMatrix = m.identity(m.create());
    var tmpMatrix = m.identity(m.create());
    var mvpMatrix = m.identity(m.create());
    var invMatrix = m.identity(m.create());

    m.lookAt([0.0, 0.0, 20.0], [0, 0, 0], [0, 1, 0], vMatrix);
    m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
    m.multiply(pMatrix, vMatrix, tmpMatrix);

    var lightDirection = [-0.5, 0.5, 0.5];

    var count = 0;

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);

    // 恒常ループ
    (function(){
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        count++;

        var rad = (count % 360) * Math.PI / 180;

        m.identity(mMatrix);
        m.rotate(mMatrix, rad, [0, 1, 0.8], mMatrix);
        m.multiply(tmpMatrix, mMatrix, mvpMatrix);

        m.inverse(mMatrix, invMatrix);
        gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
        gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
        gl.uniform3fv(uniLocation[2], lightDirection);

        gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

        gl.flush();

        setTimeout(arguments.callee, 1000 / 30);
    })();

    class ProgramParameter {
        constructor(program) {
            this.program = program;
            this.attLocation = [];
            this.attStride = [];
            this.uniLocation = [];
            this.uniType = [];
        }
    }

    function create_shader(id) {
        var shader;
    
        var scriptElement = document.getElementById(id);
    
        if(!scriptElement){ return; }
    
        switch(scriptElement.type) {
            case 'x-shader/x-vertex':
                shader = gl.createShader(gl.VERTEX_SHADER);
                break;
            case 'x-shader/x-fragment':
                shader = gl.createShader(gl.FRAGMENT_SHADER);
                break;
            default:
                return;
        }
    
        // シェーダにソースを割り当てる
        gl.shaderSource(shader, scriptElement.text);
        // シェーダコンパイル
        gl.compileShader(shader);
        // シェーダが正しくコンパイルされたかチェック
        if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            return shader;
        } else {
            alert(gl.getShaderInfoLog(shader));
        }
    }
    
    function create_program(fs, vs) {
        var program = gl.createProgram();
    
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
    
        gl.linkProgram(program);
    
        if(gl.getProgramParameter(program, gl.LINK_STATUS)) {
            gl.useProgram(program);
            return program;
        } else {
            alert(gl.getProgramInfoLog(program));
        }
    }
    
    function create_vbo(data) {
        var vbo = gl.createBuffer();
    
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    
        return vbo;
    }

    function set_attribute(vbo, attL, attS) {
        for (var i in vbo) {
            gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
            gl.enableVertexAttribArray(attL[i]);
            gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
        }
    }

    function create_ibo(data) {
        var ibo = gl.createBuffer();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

        return ibo;
    }

    function torus(row, column, irad, orad) {
        var pos = new Array(), nor = new Array(), 
            col = new Array(), idx = new Array();
        for(var i=0; i<=row; i++) {
            var r = Math.PI * 2 / row * i;
            var rr = Math.cos(r);
            var ry = Math.sin(r);
            for(var j = 0; j <= column; j++) {
                var tr = Math.PI * 2 / column * j;
                var tx = (rr * irad + orad) * Math.cos(tr);
                var ty = ry * irad;
                var tz = (rr * irad + orad) * Math.sin(tr);
                var rx = rr * Math.cos(tr);
                var rz = rr * Math.sin(tr);
                pos.push(tx, ty, tz);
                nor.push(rx, ry, rz);
                var tc = hsva(360 / column * j, 1, 1, 1);
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
        var th = h % 360;
        var i = Math.floor(th / 60);
        var f = th / 60 - i;
        var m = v * (1 - s);
        var n = v * (1 - s * f);
        var k = v * (1 - s * (1-f));
        var color = new Array();
        if(!s > 0 && !s < 0) {
            color.push(v, v, v, a);
        } else  {
            var r = new Array(v, n, m, m, k, v);
            var g = new Array(k, v, v, n, m, m);
            var b = new Array(m, m, k, v, v, n);
            color.push(r[i], g[i], b[i], a);
        }
        return color;
    }

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
})();