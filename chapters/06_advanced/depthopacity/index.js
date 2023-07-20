import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  uniform mat4 u_MvpMatrix;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec4 v_Color;

  void main() {
    gl_FragColor = v_Color;
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
gl.enable(gl.DEPTH_TEST);
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

/**
 * Setups model view projection matrix
 */
const projMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(5, 5, 5),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const modelMatrix = mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, 1));
const mvpMatrix = mat4.create();
const setProjectionMatrix = () => {
  mat4.perspective(projMatrix, glMatrix.toRadian(30), gl.canvas.width / gl.canvas.height, 1, 100);
  setMvpMatrix();
};
const setMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
setProjectionMatrix();

/**
 * Setups buffer for vertex coordinates
 *   v6----- v5
 *  /|      /|
 * v1------v0|
 * | |     | |
 * | |v7---|-|v4
 * |/      |/
 * v2------v3
 */
// prettier-ignore
const vertices = new Float32Array([
  // non-opacity cube
   1.0, 1.0,-2.0,  -1.0, 1.0,-2.0,  -1.0,-1.0,-2.0,   1.0,-1.0,-2.0,  // v0-v1-v2-v3 front
   1.0, 1.0,-2.0,   1.0,-1.0,-2.0,   1.0,-1.0,-4.0,   1.0, 1.0,-4.0,  // v0-v3-v4-v5 right
   1.0, 1.0,-2.0,   1.0, 1.0,-4.0,  -1.0, 1.0,-4.0,  -1.0, 1.0,-2.0,  // v0-v5-v6-v1 up
  -1.0, 1.0,-2.0,  -1.0, 1.0,-4.0,  -1.0,-1.0,-4.0,  -1.0,-1.0,-2.0,  // v1-v6-v7-v2 left
  -1.0,-1.0,-4.0,   1.0,-1.0,-4.0,   1.0,-1.0,-2.0,  -1.0,-1.0,-2.0,  // v7-v4-v3-v2 down
   1.0,-1.0,-4.0,  -1.0,-1.0,-4.0,  -1.0, 1.0,-4.0,   1.0, 1.0,-4.0,  // v4-v7-v6-v5 back
  // opacity cube
   1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,  // v0-v1-v2-v3 front
   1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,  // v0-v3-v4-v5 right
   1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,  // v0-v5-v6-v1 up
  -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,  // v1-v6-v7-v2 left
  -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,  // v7-v4-v3-v2 down
   1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0,  // v4-v7-v6-v5 back
])
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);

/**
 * Setups vertex colors
 */
// prettier-ignore
const colors = new Float32Array([
  // non-opacity cube
  0.4, 0.4, 1.0, 1.0,  0.4, 0.4, 1.0, 1.0,  0.4, 0.4, 1.0, 1.0,  0.4, 0.4, 1.0, 1.0,  // v0-v1-v2-v3 front(blue)
  0.4, 1.0, 0.4, 1.0,  0.4, 1.0, 0.4, 1.0,  0.4, 1.0, 0.4, 1.0,  0.4, 1.0, 0.4, 1.0,  // v0-v3-v4-v5 right(green)
  1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,  1.0, 0.4, 0.4, 1.0,  // v0-v5-v6-v1 up(red)
  1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,  1.0, 1.0, 0.4, 1.0,  // v1-v6-v7-v2 left(yellow)
  1.0, 1.0, 1.0, 1.0,  1.0, 1.0, 1.0, 1.0,  1.0, 1.0, 1.0, 1.0,  1.0, 1.0, 1.0, 1.0,  // v7-v4-v3-v2 bottom(white)
  0.4, 1.0, 1.0, 1.0,  0.4, 1.0, 1.0, 1.0,  0.4, 1.0, 1.0, 1.0,  0.4, 1.0, 1.0, 1.0,  // v4-v7-v6-v5 back(cyan)
  // opacity cube
  0.4, 0.4, 1.0, 0.4,  0.4, 0.4, 1.0, 0.4,  0.4, 0.4, 1.0, 0.4,  0.4, 0.4, 1.0, 0.4,  // v0-v1-v2-v3 front(blue)
  0.4, 1.0, 0.4, 0.4,  0.4, 1.0, 0.4, 0.4,  0.4, 1.0, 0.4, 0.4,  0.4, 1.0, 0.4, 0.4,  // v0-v3-v4-v5 right(green)
  1.0, 0.4, 0.4, 0.4,  1.0, 0.4, 0.4, 0.4,  1.0, 0.4, 0.4, 0.4,  1.0, 0.4, 0.4, 0.4,  // v0-v5-v6-v1 up(red)
  1.0, 1.0, 0.4, 0.4,  1.0, 1.0, 0.4, 0.4,  1.0, 1.0, 0.4, 0.4,  1.0, 1.0, 0.4, 0.4,  // v1-v6-v7-v2 left(yellow)
  1.0, 1.0, 1.0, 0.4,  1.0, 1.0, 1.0, 0.4,  1.0, 1.0, 1.0, 0.4,  1.0, 1.0, 1.0, 0.4,  // v7-v4-v3-v2 bottom(white)
  0.4, 1.0, 1.0, 0.4,  0.4, 1.0, 1.0, 0.4,  0.4, 1.0, 1.0, 0.4,  0.4, 1.0, 1.0, 0.4,  // v4-v7-v6-v5 back(cyan)
])
const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
gl.vertexAttribPointer(aColor, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);

/**
 * Setups buffer for indices
 */
// prettier-ignore
const indices = new Uint8Array([
  // non-opacity cube
   0,  1,  2,  0,  2,  3,    // front
   4,  5,  6,  4,  6,  7,    // right
   8,  9, 10,  8, 10, 11,    // up
  12, 13, 14, 12, 14, 15,    // left
  16, 17, 18, 16, 18, 19,    // down
  20, 21, 22, 20, 22, 23,    // back
  // opacity cube
  24, 25, 26, 24, 26, 27,    // front
  28, 29, 30, 28, 30, 31,    // right
  32, 33, 34, 32, 34, 35,    // up
  36, 37, 38, 36, 38, 39,    // left
  40, 41, 42, 40, 42, 43,    // down
  44, 45, 46, 44, 46, 47,     // back
]);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

/**
 * Setups depth mask
 */
const depthMaskCheckbox = document.getElementById("depthMask");
depthMaskCheckbox.addEventListener("input", () => {
  render();
});

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (depthMaskCheckbox.checked) {
    // render non-opacity cube
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 0);
    // lock depth buffer
    gl.depthMask(false);
    // render opacity cube
    gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_BYTE, 36);
    // unlock depth buffer
    gl.depthMask(true);
  } else {
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
  }
};
render();

getCanvasResizeObserver(() => {
  setProjectionMatrix();
  render();
});
