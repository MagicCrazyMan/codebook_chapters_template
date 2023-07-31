import {
  getCanvas,
  getCanvasResizeObserver,
  getWebGLContext,
  getWebGLCoordinateFromEvent,
  bindWebGLProgram,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_FragColor;

  void main() {
    gl_Position = a_Position;
    v_FragColor = a_Color;
    gl_PointSize = 5.0;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  
  uniform vec4 u_ColorMultiplier;
  varying vec4 v_FragColor;

  void main() {
    gl_FragColor = u_ColorMultiplier * v_FragColor;
  }
`;

const gl = getWebGLContext();
const canvas = getCanvas();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

// Allocates webgl buffer
const glBuffer = gl.createBuffer();
if (!glBuffer) throw new Error("Failed to create webgl buffer object");
// Binds buffer to webgl
gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

// Gets attribute and uniform locations
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");
const uColorMultiplier = gl.getUniformLocation(program, "u_ColorMultiplier");
// Tells webgl how to read data from buffer
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 5, 0);
gl.vertexAttribPointer(
  aColor,
  3,
  gl.FLOAT,
  false,
  Float32Array.BYTES_PER_ELEMENT * 5,
  Float32Array.BYTES_PER_ELEMENT * 2
);
// Enables reading data from buffer for a_Position attribute
gl.enableVertexAttribArray(aPosition);
gl.enableVertexAttribArray(aColor);

/**
 * Setups draw mode selector
 */
/**@enum {GLenum} */
const Mode = {
  Points: gl.POINTS,
  Lines: gl.LINES,
  LineLoop: gl.LINE_LOOP,
  LineStrip: gl.LINE_STRIP,
};
const selector = document.getElementById("graphicType");
let activeMode = Mode[selector.value];
selector.addEventListener("input", (e) => {
  activeMode = Mode[e.target.value];
  render();
});

/**
 * Setups clear
 */
const clear = document.getElementById("clear");
clear.addEventListener("click", () => {
  verticesSize = 0;
  render();
});

/**
 * Setups color multiplier
 */
gl.uniform4f(uColorMultiplier, 1, 1, 1, 1);
const colorInputs = [
  document.getElementById("colorr"),
  document.getElementById("colorg"),
  document.getElementById("colorb"),
];
colorInputs.forEach((selector) => {
  selector.value = 1;
  selector.addEventListener("input", () => {
    gl.uniform4f(
      uColorMultiplier,
      parseFloat(colorInputs[0].value),
      parseFloat(colorInputs[1].value),
      parseFloat(colorInputs[2].value),
      1
    );
    render();
  });
});

/**
 * Setups max vertex multiplier
 */
const maxVerticesSizeInput = document.getElementById("maxVerticesSize");
let maxVerticesSize = parseInt(maxVerticesSizeInput.value);
let verticesSize = 0;
let arraybuffer = new Float32Array(5 * maxVerticesSize);
maxVerticesSizeInput.addEventListener("change", () => {
  const newMaxVerticesSize = parseInt(maxVerticesSizeInput.value);
  const newVerticesSize = Math.min(verticesSize, newMaxVerticesSize);
  const newArraybuffer = new Float32Array(5 * newMaxVerticesSize);
  newArraybuffer.set(arraybuffer.slice((verticesSize - newVerticesSize) * 5));
  gl.bufferData(gl.ARRAY_BUFFER, newArraybuffer, gl.DYNAMIC_DRAW);

  maxVerticesSize = newMaxVerticesSize;
  verticesSize = newVerticesSize;
  arraybuffer = newArraybuffer;

  render();
});

/**
 * Setups coordinates updater
 */
const updatePoint = (e) => {
  if (arraybuffer.length === 0) return;

  const coordinate = getWebGLCoordinateFromEvent(e, canvas.width, canvas.height);
  const color = [Math.random(), Math.random(), Math.random()];
  // Flushes coordinate into array buffer
  if (verticesSize >= maxVerticesSize) {
    arraybuffer.set(arraybuffer.slice(5), 0);
    arraybuffer.set(coordinate, arraybuffer.length - 5);
    arraybuffer.set(color, arraybuffer.length - 5 + 2);
  } else {
    arraybuffer.set(coordinate, verticesSize * 5);
    arraybuffer.set(color, verticesSize * 5 + 2);
    verticesSize++;
  }
  // Flushes array buffer to webgl buffer
  gl.bufferData(gl.ARRAY_BUFFER, arraybuffer, gl.DYNAMIC_DRAW);

  render();
};
canvas.addEventListener("mousemove", updatePoint);
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault(); // disable scroll event
  updatePoint(e);
});

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(activeMode, 0, verticesSize);
};

getCanvasResizeObserver(render);
render();
