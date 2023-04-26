/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {GLenum} type
 * @param {string} source
 * @returns {WebGLShader}
 */
const loadShader = (gl, type, source) => {
  // 创建 Shader
  const shader = gl.createShader(type);
  // 给着色器设置 GLSL 源代码
  gl.shaderSource(shader, source);
  // 编译
  gl.compileShader(shader);

  // 检查编译状态
  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(err);
  }

  return shader;
};

/**
 *
 * @param {WebGLRenderingContext} gl
 * @param {Array.<WebGLShader>} shaders
 * @returns {WebGLProgram}
 */
const createProgram = (gl, shaders) => {
  // 创建着色器程序
  const program = gl.createProgram();
  if (!program) {
    throw new Error("Failed to create program");
  }

  // 链接着色器
  shaders.forEach((shader) => {
    gl.attachShader(program, shader);
  });
  gl.linkProgram(program);

  // 检查链接状态
  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    const err = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    shaders.forEach((shader) => {
      gl.deleteShader(shader);
    });
    throw new Error(err);
  }

  return program;
};

/**
 *
 * @param {number} count
 * @param {[number, number]} [sizes]
 * @param {boolean} [color]
 * @returns {Array<number>}
 */
const randomPoints = (count, sizes, color = false) => {
  const points = [];
  while (count > 0) {
    const x = Math.random() * 2 - 1;
    const y = Math.random() * 2 - 1;
    const point = [x, y];

    if (Array.isArray(sizes) && sizes.length >= 2) {
      const size = Math.random() * (sizes[1] - sizes[0]) + sizes[0];
      point.push(size);
    }

    if (color) {
      const r = Math.round(Math.random() * 1);
      const g = Math.round(Math.random() * 1);
      const b = Math.round(Math.random() * 1);
      point.push(r, g, b);
    }
    points.push(point);
    count--;
  }
  return points;
};

/**
 * 基础变换
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas0");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    precision mediump float;
    uniform mat4 u_ModelMatrix;
    attribute vec4 a_Position;

    void main() {
      gl_Position = u_ModelMatrix * a_Position;
    }
  `;
  const fragmentShaderCode = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0.3, -0.3, -0.3, 0.3, -0.3]),
    gl.STATIC_DRAW
  );
  const aPosition = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // 计算旋转弧度并计算对应的正弦和余弦值
  const modelMatrix = new Matrix4();
  modelMatrix.setIdentity();
  modelMatrix.rotate(60, 0, 0, 1); // 自带的库使用角度，后面三个参数代表旋转轴
  modelMatrix.translate(0.5, 0, 0);

  const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix.elements);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
})();

/**
 * 基础动画
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas1");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    precision mediump float;
    uniform mat4 u_ModelMatrix;
    attribute vec4 a_Position;

    void main() {
      gl_Position = u_ModelMatrix * a_Position;
    }
  `;
  const fragmentShaderCode = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([0, 0.3, -0.3, -0.3, 0.3, -0.3]),
    gl.DYNAMIC_DRAW
  );
  const aPosition = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  /**@type {HTMLInputElement} */
  const rpmInput = document.getElementById("animationRPMInput");
  const modelMatrix = new Matrix4();
  modelMatrix.setIdentity();
  const startTime = performance.now();
  const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
  gl.clearColor(0, 0, 0, 1);
  /**@type {FrameRequestCallback} */
  const draw = (timestamp) => {
    const rpm = parseFloat(rpmInput.value); // Revolutions Per minutes
    const minutes = ((timestamp - startTime) / 1000 / 60) % rpm;
    const angle = (rpm * minutes * 360) % 360;

    modelMatrix.setIdentity();
    modelMatrix.rotate(angle, 0, 0, 1);
    modelMatrix.translate(0.5, 0, 0);

    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix.elements);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
})();

/**
 * 交错组织缓冲区对象数据
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas2");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    attribute vec4 a_Position;
    attribute float a_PointSize;

    void main() {
      gl_Position = a_Position;
      gl_PointSize = a_PointSize;
    }
  `;
  const fragmentShaderCode = `
    void main() {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  const points = randomPoints(1000, [1, 5]);
  const bufferArray = new Float32Array(points.flat(1));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, bufferArray, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  const aPointSize = gl.getAttribLocation(program, "a_PointSize");
  const FSIZE = bufferArray.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, FSIZE * 3, 0);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPointSize, 1, gl.FLOAT, false, FSIZE * 3, FSIZE * 2);
  gl.enableVertexAttribArray(aPointSize);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, points.length);
})();

/**
 * Varying 传递颜色及颜色的内插
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas3");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    attribute vec4 a_Position;
    attribute float a_PointSize;
    // attribute 颜色
    attribute vec4 a_Color;
    // 传递给片元着色器的 varying 颜色
    varying vec4 v_Color;

    void main() {
      gl_Position = a_Position;
      gl_PointSize = a_PointSize;
      // 从 attribute 传递给 varying
      v_Color = a_Color;
    }
  `;
  const fragmentShaderCode = `
    precision mediump float;
    // 接收来自顶点着色器的数据
    varying vec4 v_Color;

    void main() {
      gl_FragColor = v_Color;
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  const points = randomPoints(10, [1, 5], true);
  const bufferArray = new Float32Array(points.flat(1));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, bufferArray, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  const aPointSize = gl.getAttribLocation(program, "a_PointSize");
  const aColor = gl.getAttribLocation(program, "a_Color");
  const FSIZE = bufferArray.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, FSIZE * 6, 0);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPointSize, 1, gl.FLOAT, false, FSIZE * 6, FSIZE * 2);
  gl.enableVertexAttribArray(aPointSize);
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
  gl.enableVertexAttribArray(aColor);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.LINES, 0, points.length);
})();

/**
 * 指定端点颜色的渐变色彩三角形
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas7");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    varying vec4 v_Color;

    void main() {
      gl_Position = a_Position;
      v_Color = a_Color;
    }
  `;
  const fragmentShaderCode = `
    precision mediump float;
    varying vec4 v_Color;

    void main() {
      gl_FragColor = v_Color;
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  const bufferArray = new Float32Array([
    0, 0.3, 1.0, 0.0, 0.0, -0.3, -0.3, 0.0, 1.0, 0.0, 0.3, -0.3, 0.0, 0.0, 1.0,
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, bufferArray, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  const aColor = gl.getAttribLocation(program, "a_Color");
  const FSIZE = bufferArray.BYTES_PER_ELEMENT;
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, FSIZE * 5, 0);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, FSIZE * 5, FSIZE * 2);
  gl.enableVertexAttribArray(aColor);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
})();

/**
 * 通过画布比例计算的渐变色彩三角形
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas4");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    attribute vec4 a_Position;

    void main() {
      gl_Position = a_Position;
    }
  `;
  const fragmentShaderCode = `
    precision mediump float;
    uniform float u_Width;
    uniform float u_Height;

    void main() {
      gl_FragColor = vec4(
        gl_FragCoord.x / u_Width,
        0.0,
        gl_FragCoord.y / u_Height,
        1.0
      );
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  const bufferArray = new Float32Array([0, 0.3, -0.3, -0.3, 0.3, -0.3]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, bufferArray, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  const uWidth = gl.getUniformLocation(program, "u_Width");
  const uHeight = gl.getUniformLocation(program, "u_Height");
  gl.uniform1f(uWidth, canvas.width);
  gl.uniform1f(uHeight, canvas.height);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
})();

/**
 * 纹理贴图
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas5");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    varying vec2 v_TexCoord;

    void main() {
      gl_Position = a_Position;
      v_TexCoord = a_TexCoord;
    }
  `;
  const fragmentShaderCode = `
    precision mediump float;
    uniform sampler2D u_Sampler;
    varying vec2 v_TexCoord;

    void main() {
      gl_FragColor = texture2D(u_Sampler, v_TexCoord);
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  // prettier-ignore
  const verticesTexCoords = new Float32Array([
    // 左侧两个为 WebGL xy 坐标，右侧两个为纹理 st 坐标
    -0.5,  0.5, -0.3,  1.7,
    -0.5, -0.5, -0.3, -0.2,
     0.5,  0.5,  1.7,  1.7,
     0.5, -0.5,  1.7, -0.2
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);
  const FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
  const aPosition = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, FSIZE * 4, 0);
  gl.enableVertexAttribArray(aPosition);
  const aTexCoord = gl.getAttribLocation(program, "a_TexCoord");
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
  gl.enableVertexAttribArray(aTexCoord);

  // 初始化纹理
  const image = new Image();
  image.src = "../../samples/resources/sky.JPG";
  image.onload = () => {
    // 初始化纹理
    const texture = gl.createTexture();
    const uSampler = gl.getUniformLocation(program, "u_Sampler");
    // 加载图片完成，初始化纹理
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // 需要对纹理进行 y 轴翻转
    // 开启 0 号纹理单元
    gl.activeTexture(gl.TEXTURE0);
    // 向 target 绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // 配置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
    // 配置纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

    // 将 0 号纹理传递给着色器
    gl.uniform1i(uSampler, 0);

    // 绘制
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
})();

/**
 * 多重纹理贴图
 */
(() => {
  /**
   * @type {HTMLCanvasElement}
   */
  const canvas = document.getElementById("canvas6");
  const gl = canvas.getContext("webgl");

  const vertexShaderCode = `
    attribute vec4 a_Position;
    attribute vec2 a_TexCoord;
    varying vec2 v_TexCoord;

    void main() {
      gl_Position = a_Position;
      v_TexCoord = a_TexCoord;
    }
  `;
  const fragmentShaderCode = `
    precision mediump float;
    uniform sampler2D u_Sampler0;
    uniform sampler2D u_Sampler1;
    varying vec2 v_TexCoord;

    void main() {
      vec4 color0 = texture2D(u_Sampler0, v_TexCoord);
      vec4 color1 = texture2D(u_Sampler1, v_TexCoord);
      gl_FragColor = color0 * color1;
    }
  `;

  // 创建着色器
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

  // 创建着色器程序，需要注意，一个 program 需要至少一个 FRAGMENT_SHADER
  const program = createProgram(gl, [vertexShader, fragmentShader]);
  gl.useProgram(program);

  // prettier-ignore
  const verticesTexCoords = new Float32Array([
    // 左侧两个为 WebGL xy 坐标，右侧两个为纹理 st 坐标
    -1,  1,  0,  1,
    -1, -1,  0,  0,
     1,  1,  1,  1,
     1, -1,  1,  0
  ]);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);
  const FSIZE = verticesTexCoords.BYTES_PER_ELEMENT;
  const aPosition = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, FSIZE * 4, 0);
  gl.enableVertexAttribArray(aPosition);
  const aTexCoord = gl.getAttribLocation(program, "a_TexCoord");
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, FSIZE * 4, FSIZE * 2);
  gl.enableVertexAttribArray(aTexCoord);

  // 初始化纹理
  const texture0 = gl.createTexture();
  const texture1 = gl.createTexture();
  const uSampler0 = gl.getUniformLocation(program, "u_Sampler0");
  const uSampler1 = gl.getUniformLocation(program, "u_Sampler1");
  const image0 = new Image();
  const image1 = new Image();
  const promise0 = new Promise((resolve) => {
    image0.src = "../../samples/resources/redflower.jpg";
    image0.onload = resolve;
  });
  const promise1 = new Promise((resolve) => {
    image1.src = "../../samples/resources/circle.gif";
    image1.onload = resolve;
  });

  Promise.all([promise0, promise1]).then(() => {
    // 加载图片完成，初始化纹理 0
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // 需要对纹理进行 y 轴翻转
    // 开启 0 号纹理单元
    gl.activeTexture(gl.TEXTURE0);
    // 向 target 绑定纹理对象
    gl.bindTexture(gl.TEXTURE_2D, texture0);
    // 配置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // 配置纹理图像
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image0);
    // 将 0 号纹理传递给着色器
    gl.uniform1i(uSampler0, 0);

    // 同样步骤，初始化纹理 1
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // 需要对纹理进行 y 轴翻转
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image1);
    gl.uniform1i(uSampler1, 1);

    // 绘制
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
})();
