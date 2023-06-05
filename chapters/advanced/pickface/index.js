import { glMatrix, mat4, vec3 } from "gl-matrix";
import {
  bindWebGLProgram,
  getCanvas,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  attribute float a_Face;

  uniform mat4 u_MvpMatrix;
  uniform bool u_Clicked;
  uniform int u_PickedFace;

  varying vec4 v_Color;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    if (u_Clicked) {
      v_Color = vec4(a_Color.rgb, a_Face / 255.0);
    } else {
      // Display white color if face is picked
      v_Color = (int(a_Face) == u_PickedFace) ? vec4(1.0) : a_Color;
    }
  }
`;
const fragmentShader = `
  #ifdef GL_ES
    precision mediump float; 
  #endif

  varying vec4 v_Color;

  void main() {
    gl_FragColor = v_Color;
  }
`;

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);
const program = bindWebGLProgram(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");
const aFace = gl.getAttribLocation(program, "a_Face");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uPickedFace = gl.getUniformLocation(program, "u_PickedFace");
const uClicked = gl.getUniformLocation(program, "u_Clicked");

/**
 * Setups vertices and texture coords
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
  1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,  // v0-v1-v2-v3 front
  1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,  // v0-v3-v4-v5 right
  1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,  // v0-v5-v6-v1 up
 -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,  // v1-v6-v7-v2 left
 -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,  // v7-v4-v3-v2 down
  1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0   // v4-v7-v6-v5 back
]);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
// prettier-ignore
const colors = new Float32Array([
  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front(blue)
  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right(green)
  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up(red)
  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left(yellow)
  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 bottom(white)
  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back(cyan)
]);
const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);
// prettier-ignore
const faces = new Uint8Array([
  1, 1, 1, 1,  // v0-v1-v2-v3 front
  2, 2, 2, 2,  // v0-v3-v4-v5 right
  3, 3, 3, 3,  // v0-v5-v6-v1 up
  4, 4, 4, 4,  // v1-v6-v7-v2 left
  5, 5, 5, 5,  // v7-v4-v3-v2 bottom
  6, 6, 6, 6   // v4-v7-v6-v5 back
]);
const facesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, facesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, faces, gl.STATIC_DRAW);
gl.vertexAttribPointer(aFace, 1, gl.UNSIGNED_BYTE, false, 0, 0);
gl.enableVertexAttribArray(aFace);
// prettier-ignore
const indices = new Uint8Array([
   0,  1,  2,  0,  2,  3,    // front
   4,  5,  6,  4,  6,  7,    // right
   8,  9, 10,  8, 10, 11,    // up
  12, 13, 14, 12, 14, 15,    // left
  16, 17, 18, 16, 18, 19,    // down
  20, 21, 22, 20, 22, 23     // back
]);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

/**
 * Setups model view projection matrix
 */
const projMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(5, 3, 5),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const modelMatrix = mat4.create();
const mvpMatrix = mat4.create();
const ANGLE_PER_SECOND = glMatrix.toRadian(20);
let lastRenderTime = 0;
const setModelMatrix = (renderTime = lastRenderTime) => {
  const offset = ANGLE_PER_SECOND * ((renderTime - lastRenderTime) / 1000);
  mat4.rotateY(modelMatrix, modelMatrix, offset);
  mat4.rotateX(modelMatrix, modelMatrix, offset);
  setMvpMatrix();

  lastRenderTime = renderTime;
};
const setProjMatrix = () => {
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
setProjMatrix();

/**
 * Setup pick event
 */
const canvas = getCanvas();
const pickLabel = document.getElementById("pickLabel");
const pixels = new Uint8Array(4);
const pick = ({ x, y }) => {
  // set to clicked state and render
  gl.uniform1i(uClicked, 1);
  render();

  // read pixel color
  gl.readPixels(x, gl.canvas.height - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  console.log(pixels);
  // get face index from alpha component of the pixel color
  const face = pixels[3];
  if (face !== 0) {
    pickLabel.innerText = `Picked Cube Face ${face}`;
  } else {
    pickLabel.innerText = "Not Picked Anything";
  }

  gl.uniform1i(uClicked, 0);
  gl.uniform1i(uPickedFace, face);
  render();
};
canvas.addEventListener("click", pick);

const render = (renderTime) => {
  setModelMatrix(renderTime);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  requestAnimationFrame(render);
};
requestAnimationFrame(render);

getCanvasResizeObserver(() => {
  setProjMatrix();
  render();
});
