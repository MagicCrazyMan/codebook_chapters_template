import { glMatrix, mat4, vec3 } from "gl-matrix";
import {
  bindWebGLProgram,
  getCanvas,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;

  uniform mat4 u_MvpMatrix;

  varying vec2 v_TexCoord;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_TexCoord;
  }
`;
const fragmentShader = `
  #ifdef GL_ES
    precision mediump float;
  #endif

  uniform sampler2D u_Sampler;

  varying vec2 v_TexCoord;

  void main() {
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
  }
`;

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);
const program = bindWebGLProgram(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aTexCoord = gl.getAttribLocation(program, "a_TexCoord");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uSampler = gl.getUniformLocation(program, "u_Sampler");

/**
 * Prepares texture image
 *
 * Must send request via fetch
 */
/**@type {HTMLImageElement} */
const image = await fetch("/resources/sky.jpg")
  .then((res) => res.blob())
  .then((blob) => URL.createObjectURL(blob))
  .then(
    (url) =>
      new Promise((resolve) => {
        const image = new Image();
        image.src = url;
        image.onload = () => {
          resolve(image);
        };
      })
  );
const texture = gl.createTexture();
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
gl.uniform1i(uSampler, 0);

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
const texCoords = new Float32Array([
  1, 1,  0, 1,  0, 0,  1, 0, // front
  1, 1,  0, 1,  0, 0,  1, 0, // right
  1, 1,  0, 1,  0, 0,  1, 0, // up
  1, 1,  0, 1,  0, 0,  1, 0, // left
  1, 1,  0, 1,  0, 0,  1, 0, // down
  1, 1,  0, 1,  0, 0,  1, 0, // back
]);
const texCoordsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aTexCoord);
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
 * Setups mouse move
 */
const ANGLE_PER_PIXELS = glMatrix.toRadian(0.5);
let dragging = false;
let previousPosition = [];
const canvas = getCanvas();
canvas.addEventListener("mousedown", ({ x, y }) => {
  dragging = true;
  previousPosition[0] = x;
  previousPosition[1] = y;
});
canvas.addEventListener("mouseup", () => {
  dragging = false;
  previousPosition.length = 0;
});
canvas.addEventListener("mousemove", ({ x, y }) => {
  if (!dragging) return;

  const [ox, oy] = previousPosition;
  mat4.rotateY(modelMatrix, modelMatrix, (x - ox) * ANGLE_PER_PIXELS);
  mat4.rotateX(modelMatrix, modelMatrix, (y - oy) * ANGLE_PER_PIXELS);

  previousPosition[0] = x;
  previousPosition[1] = y;

  setMvpMatrix();
  render();
});

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
};
render();

getCanvasResizeObserver(() => {
  setProjMatrix();
  render();
});
