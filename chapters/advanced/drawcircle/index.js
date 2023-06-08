import { mat4, vec3 } from "gl-matrix";
import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  uniform float u_PointSize;

  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_PointSize;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  vec2 circleCenter = vec2(0.5, 0.5);

  void main() {
    float dist = distance(gl_PointCoord, circleCenter);
    if (dist <= 0.5) {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    } else {
      discard;
    }
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);

/**
 * Setups vertices
 */
const [aPosition] = bindWebGLBuffer(gl, program, ["a_Position"]);
// prettier-ignore
const vertices = new Float32Array([
    0.0,  0.75,
  -0.75, -0.75,
   0.75, -0.75,
]);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

/**
 * Setups point size
 */
const uPointSize = gl.getUniformLocation(program, "u_PointSize");
const pointSizeInput = document.getElementById("pointSize");
const setPointSize = () => {
  gl.uniform1f(uPointSize, parseFloat(pointSizeInput.value));
};
pointSizeInput.addEventListener("input", () => {
  setPointSize();
  render();
});
setPointSize();

/**
 * Setup model view projection matrix
 */
const modelMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(0, 0, 10),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projMatrix = mat4.create();
const mvpMatrix = mat4.create();
const setProjMatrix = () => {
  const aspect = gl.canvas.width / gl.canvas.height;
  mat4.ortho(projMatrix, -aspect, aspect, -1, 1, 1, 100);
  setMvpMatrix();
};
const setMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
};
setProjMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, 3);
};
render();

getCanvasResizeObserver(() => {
  setProjMatrix();
  render();
});
