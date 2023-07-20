import { mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;

  uniform mat4 u_MvpMatrix;

  varying vec4 v_Color;

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
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");

const buffer = gl.createBuffer();
// prettier-ignore
const verticesColors = new Float32Array([
   0.0,  0.5,  -0.4,  0.4,  1.0,  0.4,  0.8, // The back green one
  -0.5, -0.5,  -0.4,  0.4,  1.0,  0.4,  0.8,
   0.5, -0.5,  -0.4,  1.0,  0.4,  0.4,  0.8,

   0.5,  0.4,  -0.2,  1.0,  0.4,  0.4,  0.8, // The middle yerrow one
  -0.5,  0.4,  -0.2,  1.0,  1.0,  0.4,  0.8,
   0.0, -0.6,  -0.2,  1.0,  1.0,  0.4,  0.8,

   0.0,  0.5,   0.0,  0.4,  0.4,  1.0,  0.8,  // The front blue one 
  -0.5, -0.5,   0.0,  0.4,  0.4,  1.0,  0.8,
   0.5, -0.5,   0.0,  1.0,  0.4,  0.4,  0.8, 
]);
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, verticesColors, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 7, 0);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(
  aColor,
  4,
  gl.FLOAT,
  false,
  Float32Array.BYTES_PER_ELEMENT * 7,
  Float32Array.BYTES_PER_ELEMENT * 3
);
gl.enableVertexAttribArray(aColor);

/**
 * Setups model view projection matrix
 */
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const projMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(0.2, 0.25, 0.25),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const modelMatrix = mat4.create();
const mvpMatrix = mat4.create();
const setProjMatrix = () => {
  const aspect = gl.canvas.width / gl.canvas.height;
  mat4.ortho(projMatrix, -aspect, aspect, -1, 1, 0, 2);
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

gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.DEPTH_TEST);
const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 9);
};
render();

getCanvasResizeObserver(() => {
  setProjMatrix();
  render();
});
