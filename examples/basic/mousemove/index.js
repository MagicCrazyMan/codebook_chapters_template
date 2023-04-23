import { getCanvas, getCanvasResizeObserver, getWebGLContext, setupWebGL } from "../../libs/common";

/**
 * Vertex shader code using `attribute`.
 */
const vertexShaderCode = `
  attribute vec4 a_Position;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = 5.0;
  }
`;

/**
 * Fragment shader code using `uniform`.
 */
const fragmentShaderCode = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;

const gl = getWebGLContext();
const canvas = getCanvas();

// Setups WebGL
const program = setupWebGL(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShaderCode },
  { type: gl.FRAGMENT_SHADER, source: fragmentShaderCode },
]);

// Gets attribute location
const aPosition = gl.getAttribLocation(program, "a_Position");
if (aPosition < 0) new Error("Failed to get the pointer of a_Position");
// Gets uniform location
const uFragColor = gl.getUniformLocation(program, "u_FragColor");
if (uFragColor === null) throw new Error("Failed to get the reference of u_Position");

const maxPointSize = 400;
/**@type {[number, number, number, number, number][]} */
const points = [];
const updatePoint = (e) => {
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
    return;
  }
  // Calculates point coordinate under WebGL coordinate system
  const halfWidth = canvas.width / 2;
  const halfHeight = canvas.height / 2;
  const x = (clientX - halfWidth) / halfWidth;
  const y = (halfHeight - clientY) / halfHeight;

  // Picks random color
  const r = Math.random();
  const g = Math.random();
  const b = Math.random();

  points.push([x, y, r, g, b]);
  if (points.length > maxPointSize) {
    points.shift();
  }

  render();
};

canvas.addEventListener("mousemove", updatePoint);
canvas.addEventListener("touchmove", (e) => {
  e.preventDefault(); // disable scroll event
  updatePoint(e);
});

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  points.forEach(([x, y, r, g, b]) => {
    // Transfer point coordinate to attribute
    gl.vertexAttrib3f(aPosition, x, y, 0.0);
    // Transfer color to uniform
    gl.uniform4f(uFragColor, r, g, b, 1.0);
    // draw point
    gl.drawArrays(gl.POINTS, 0, 1);
  });
};

getCanvasResizeObserver(render);
render();
