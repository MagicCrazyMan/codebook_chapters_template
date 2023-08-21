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
 * Gets coordinate under canvas coordinate system from touch or mouse event
 * @param {MouseEvent | TouchEvent} e Touch or mouse event
 * @returns {[number, number]} Coordinate under canvas coordinate system
 */
export const getCanvasCoordinateFromEvent = (e) => {
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

  return [clientX, clientY];
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

/**
 * Watches dom input.
 * @param {string} id Element ids
 * @param {(value: string | boolean) => void} callback callback
 * @param {boolean} [immediate] Invokes callback immediately, default `true`
 */
export const watchInput = (id, callback, immediate = true) => {
  const element = document.getElementById(id);
  const trigger = () => {
    if (element.tagName === "SL-SWITCH") {
      callback(element.checked);
    } else {
      callback(element.value);
    }
  };
  if (element.tagName.startsWith("SL-")) {
    element.addEventListener("sl-input", trigger);
  } else {
    element.addEventListener("input", trigger);
  }

  if (immediate) trigger();
};

/**
 * Watches multiples dom input and collects them into single callback.
 * @param {string[]} ids Element ids
 * @param {(values: string[]) => void} callback callback
 * @param {boolean} [immediate] Invokes callback immediately, default `true`
 */
export const watchInputs = (ids, callback, immediate = true) => {
  const elements = ids.map((id) => document.getElementById(id));
  const trigger = () => {
    const values = elements.map((ele) => {
      if (ele.tagName === "SL-SWITCH") {
        return ele.checked;
      } else {
        return ele.value;
      }
    });

    callback(values);
  };
  elements.forEach((ele) => {
    if (ele.tagName.startsWith("SL-")) {
      ele.addEventListener("sl-input", trigger);
    } else {
      ele.addEventListener("input", trigger);
    }
  });

  if (immediate) trigger();
};

/**
 * Converts css-styled rgb or rgba color to webgl floats
 * @param {string} color css-styled rgb or rgba color
 * @returns {number[]} rgba color in webgl floats
 */
export const rgbToFloat = (color) => {
  const value = /^rgba?\((.*)\)$/.exec(color)[1];
  const [r, g, b, a] = value.split(",");
  return [parseInt(r) / 255, parseInt(g) / 255, parseInt(b) / 255, a ? parseFloat(a) : 1];
};

/**
 * Converts hsv to webgl floats
 *
 * https://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
 * @param {string} color css-styled hsv or hsva color
 * @returns {number[]} webgl floats
 */
export const hsvToFloat = (color) => {
  const value = /^hsva?\((.*)\)$/.exec(color)[1];
  const splitted = value.split(",");
  const h = parseFloat(splitted[0]);
  const s = parseFloat(splitted[1].slice(0, -1)) / 100;
  const v = parseFloat(splitted[2].slice(0, -1)) / 100;
  const a = parseFloat(splitted[3]) ?? 1;

  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }

  return [r, g, b, a];
};

/**
 * Converts hsl to webgl floats
 *
 * https://www.30secondsofcode.org/js/s/hsl-to-rgb/
 * @param {string} color css-styled hsv or hsva color
 * @returns {number[]} webgl floats
 */
export const hslToFloat = (color) => {
  const value = /^hsla?\((.*)\)$/.exec(color)[1];
  const splitted = value.split(",");
  const h = parseFloat(splitted[0]);
  const s = parseFloat(splitted[1].slice(0, -1)) / 100;
  const l = parseFloat(splitted[2].slice(0, -1)) / 100;
  const a = parseFloat(splitted[3]) ?? 1;

  const k = (n) => (n + h / 30) % 12;
  const b = s * Math.min(l, 1 - l);
  const f = (n) => l - b * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  return [f(0), f(8), f(4), a];
};

/**
 * Converts hex to webgl floats
 * @param {string} color css-styled hsv or hsva color
 * @returns {number[]} webgl floats
 */
export const hexToFloat = (color) => {
  const value = color.slice(1).trim();
  let r, g, b, a;
  if (value.length === 3) {
    r = parseInt(value[0], 16) / 255;
    g = parseInt(value[1], 16) / 255;
    b = parseInt(value[2], 16) / 255;
    a = 1;
  } else if (value.length === 4) {
    r = parseInt(value[0], 16) / 255;
    g = parseInt(value[1], 16) / 255;
    b = parseInt(value[2], 16) / 255;
    a = parseInt(value[3], 16) / 255;
  } else if (value.length === 6) {
    r = parseInt(value.slice(0, 2), 16) / 255;
    g = parseInt(value.slice(2, 4), 16) / 255;
    b = parseInt(value.slice(4), 16) / 255;
    a = 1;
  } else if (value.length === 8) {
    r = parseInt(value.slice(0, 2), 16) / 255;
    g = parseInt(value.slice(2, 4), 16) / 255;
    b = parseInt(value.slice(4, 6), 16) / 255;
    a = parseInt(value.slice(6), 16) / 255;
  } else {
    throw new Error(`unknown hex color value ${color}`);
  }

  return [r, g, b, a];
};

/**
 * Converts css-styled color to webgl floats
 * @param {string} color css-styled color
 * @returns {number[]} webgl floats
 */
export const colorToFloat = (color) => {
  color = color.trim();
  if (color.startsWith("rgb")) {
    return rgbToFloat(color);
  } else if (color.startsWith("hsv")) {
    return hsvToFloat(color);
  } else if (color.startsWith("hsl")) {
    return hslToFloat(color);
  } else if (color.startsWith("#")) {
    return hexToFloat(color);
  } else {
    throw new Error(`unknown color value ${color}`);
  }
};
