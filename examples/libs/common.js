/**
 * Gets canvas element
 * @returns {HTMLCanvasElement} Canvas element
 */
export const getCanvas = () => {
  const canvas = document.getElementById("canvas");
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  return canvas;
};

/**
 * Gets canvas resize observer
 * @param {ResizeObserverCallback} callback Resize observer callback
 * @param {boolean} [autoSize] Auto update canvas size
 * @param {boolean} [autoViewport] Auto update WebGL viewport
 * @returns {ResizeObserver} observer
 */
export const getCanvasResizeObserver = (callback, autoSize = true, autoViewport = true) => {
  const gl = getWebGLContext();
  const observer = new ResizeObserver((entries) => {
    if (autoSize) {
      gl.canvas.width = gl.canvas.clientWidth;
      gl.canvas.height = gl.canvas.clientHeight;
    }

    if (autoViewport) {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
    callback(entries);
  });
  observer.observe(gl.canvas);
  return observer;
};

/**
 * Gets WebGL2 context
 * @returns {WebGL2RenderingContext} WebGL2 context
 */
export const getWebGLContext = () => {
  const canvas = getCanvas();
  const gl = canvas.getContext("webgl2", {
    preserveDrawingBuffer: true,
  });
  if (!gl)
    throw new Error("Failed to initialize WebGL. Your browser or machine may not support it.");

  return gl;
};

/**
 * Compile GLSL Shader
 * @param {WebGL2RenderingContext} gl WebGL2 context
 * @param {GLenum} type Shader type
 * @param {string} source GLSL source code
 * @returns {WebGLShader} WebGL2 shader
 */
export const compileShader = (gl, type, source) => {
  // create shader
  const shader = gl.createShader(type);
  // attach source code
  gl.shaderSource(shader, source);
  // compile shader
  gl.compileShader(shader);

  // verify compile status
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(err);
  }

  return shader;
};

/**
 * Creates WebGL program.
 * @param {WebGL2RenderingContext} gl WebGL2 context
 * @param {WebGLShader[]} shaders Shaders
 * @returns {WebGLProgram} WebGL2 program
 */
export const createProgram = (gl, shaders) => {
  // create program
  const program = gl.createProgram();
  if (!program) throw new Error("Failed to create WebGL2 program.");

  // attach shaders
  shaders.forEach((shader) => {
    gl.attachShader(program, shader);
  });
  // link program
  gl.linkProgram(program);

  // verify link status
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
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
 * Compiles shader codes,
 * create program,
 * set clearing color of color buffer to transparent and
 * bind them into WebGL context altogether
 *
 * @typedef {Object} CompileShader
 * @property {string} source Shader code
 * @property {GLenum} type Shader type
 *
 * @param {WebGL2RenderingContext} gl WebGL2 context
 * @param {CompileShader[]} codes Shader codes
 * @returns {WebGLProgram} WebGL2 program
 */
export const bindWebGLProgram = (gl, codes) => {
  // Compile shader codes
  const shaders = codes.map(({ type, source }) => compileShader(gl, type, source));
  // Creates program
  const program = createProgram(gl, shaders);
  gl.useProgram(program);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);

  return program;
};

/**
 * Calculates coordinate under WebGL coordinate system by offset x, offset y and canvas size
 * @param {number} clientX Client X
 * @param {number} clientY Client Y
 * @param {number} width Canvas width
 * @param {number} height Canvas height
 * @returns {[number, number]} Coordinate under WebGL coordinate system
 */
export const getWebGLCoordinateFromMousePosition = (clientX, clientY, width, height) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  return [(clientX - halfWidth) / halfWidth, (halfHeight - clientY) / halfHeight];
};

/**
 * Calculates coordinate under WebGL coordinate system from touch or mouse event and canvas size
 * @param {MouseEvent | TouchEvent} e Touch or mouse event
 * @param {number} width Canvas width
 * @param {number} height Canvas height
 * @returns {[number, number]} Coordinate under WebGL coordinate system
 */
export const getWebGLCoordinateFromEvent = (e, width, height) => {
  let clientX, clientY;
  if (e instanceof MouseEvent) {
    clientX = e.clientX;
    clientY = e.clientY;
  } else if (e instanceof TouchEvent) {
    const item = e.touches.item(0);
    if (!item) return;
    clientX = item.clientX;
    clientY = item.clientY;
  } else {
    throw new Error("Unsupported event type");
  }

  return getWebGLCoordinateFromMousePosition(clientX, clientY, width, height);
};

/**
 * Creates and binds buffer to WebGL,
 * and enable buffer for each incoming attribute parameters
 * @param {WebGL2RenderingContext} gl WebGL2 context
 * @param {WebGLProgram} program WebGL program
 * @param {string[]} [attributeNames] Attribute names
 * @return {number[]} Locations of each attribute
 */
export const bindWebGLBuffer = (gl, program, attributeNames = []) => {
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error("Failed to create WebGL2 buffer");
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  return attributeNames.map((name) => {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) throw new Error(`Failed to get attribute location of ${name}`);
    gl.enableVertexAttribArray(location);

    return location;
  });
};
