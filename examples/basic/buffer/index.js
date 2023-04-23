import {
  getCanvas,
  getCanvasResizeObserver,
  getWebGLContext,
  getWebGLCoordinateFromEvent,
  setupWebGL,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;

  void main() {
    gl_Position = a_Position;
    gl_PointSize = 5.0;
  }
`;
const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const gl = getWebGLContext();
const canvas = getCanvas();
const program = setupWebGL(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

// Allocates webgl buffer
const glBuffer = gl.createBuffer();
if (!glBuffer) throw new Error("Failed to create webgl buffer object");
// Binds buffer to webgl
gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);

// Gets a_Position attribute location
const aPosition = gl.getAttribLocation(program, "a_Position");
// Tells webgl how to read data from buffer
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
// Enables reading data from buffer for a_Position attribute
gl.enableVertexAttribArray(aPosition);

/**
 * Setups coordinates updater
 */
const maxPointSize = 200;
let pointSize = 0;
const arraybuffer = new Float32Array(2 * maxPointSize);
const updatePoint = (e) => {
  const coordinate = getWebGLCoordinateFromEvent(e, canvas.width, canvas.height);
  // Adds coordinate into array buffer
  if (pointSize >= maxPointSize) {
    arraybuffer.set(arraybuffer.slice(2), 0);
    arraybuffer.set(coordinate, arraybuffer.length - 2);
  } else {
    arraybuffer.set(coordinate, pointSize * 2);
    pointSize++;
  }
  // Transfers data from array buffer to webgl buffer
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
  gl.drawArrays(gl.POINTS, 0, pointSize);
};

getCanvasResizeObserver(render);
render();
