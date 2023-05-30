import { glMatrix, mat4, quat, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;
  uniform mat4 u_ModelViewProjectionMatrix;

  void main() {
    gl_Position = u_ModelViewProjectionMatrix * a_Position;
    v_Color = a_Color;
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
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups model view projection matrix
 */
const uProjectionMatrix = gl.getUniformLocation(program, "u_ModelViewProjectionMatrix");
const eyeRadius = 8;
let rotationX = glMatrix.toRadian(30);
let rotationY = glMatrix.toRadian(30);
const viewMatrix = mat4.create();
const setViewMatrix = () => {
  const ratio = (Math.cos(rotationX) * eyeRadius) / eyeRadius;
  mat4.lookAt(
    viewMatrix,
    vec3.fromValues(
      ratio * Math.cos(rotationY) * eyeRadius,
      Math.sin(rotationX) * eyeRadius,
      ratio * Math.sin(rotationY) * eyeRadius
    ),
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(0, 1, 0)
  );
};
setViewMatrix();
const projectionMatrix = mat4.create();
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
};
setProjectionMatrix();
const modelMatrix = mat4.fromRotationTranslationScale(
  mat4.create(),
  quat.fromEuler(quat.create(), 0, 0, 0),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(1, 1, 1)
);
const modelViewProjectionMatrix = mat4.create();
const setModelViewProjectionMatrix = () => {
  mat4.identity(modelViewProjectionMatrix);
  mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, projectionMatrix);
  mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, viewMatrix);
  mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix);
  gl.uniformMatrix4fv(uProjectionMatrix, false, modelViewProjectionMatrix);
};
setModelViewProjectionMatrix();
getCanvasResizeObserver(() => {
  setProjectionMatrix();
  setModelViewProjectionMatrix();
  render();
});
document.addEventListener("keydown", ({ key }) => {
  switch (key) {
    case "ArrowUp":
      rotationX += glMatrix.toRadian(2);
      break;
    case "ArrowDown":
      rotationX -= glMatrix.toRadian(2);
      break;
    case "ArrowLeft":
      rotationY += glMatrix.toRadian(2);
      break;
    case "ArrowRight":
      rotationY -= glMatrix.toRadian(2);
      break;
    default:
      return;
  }
  setViewMatrix();
  setModelViewProjectionMatrix();
  render();
});

/**
 * Setups buffer for vertex coordinates and colors
 *   v6----- v5
 *  /|      /|
 * v1------v0|
 * | |     | |
 * | |v7---|-|v4
 * |/      |/
 * v2------v3
 */
// prettier-ignore
const verticesColors = new Float32Array([
   1.0,  1.0,  1.0, // v0
  -1.0,  1.0,  1.0, // v1
  -1.0, -1.0,  1.0, // v2
   1.0, -1.0,  1.0, // v3
   1.0, -1.0, -1.0, // v4
   1.0,  1.0, -1.0, // v5
  -1.0,  1.0, -1.0, // v6
  -1.0, -1.0, -1.0, // v7
   1.0,  1.0,  1.0, // v0, white
   1.0,  0.0,  1.0, // v1, magenta
   1.0,  0.0,  0.0, // v2, red
   1.0,  1.0,  0.0, // v3, yellow
   0.0,  1.0,  0.0, // v4, green
   0.0,  1.0,  1.0, // v5, cyan
   0.0,  0.0,  1.0, // v6, blue
   0.0,  0.0,  0.0, // v7, black
])
const verticesColorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesColorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 24);
gl.enableVertexAttribArray(aPosition);
gl.enableVertexAttribArray(aColor);

/**
 * Setups buffer for indices
 */
// prettier-ignore
const indices = new Uint8Array([
  0, 1, 2, 0, 2, 3, // front
  0, 3, 4, 0, 4, 5, // right
  0, 5, 6, 0, 6, 1, // up
  1, 6, 7, 1, 7, 2, // left
  7, 4, 3, 7, 3, 2, // bottom,
  4, 7, 6, 4, 6, 5, // back
]);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

gl.enable(gl.DEPTH_TEST);
const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
};
render();
