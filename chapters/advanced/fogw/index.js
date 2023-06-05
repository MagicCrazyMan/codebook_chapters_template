import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;

  uniform mat4 u_MvpMatrix;

  varying vec4 v_Color;
  varying float v_Dist;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Color = a_Color;
    v_Dist = gl_Position.w;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float; 
  #else
    precision mediump float;
  #endif
  
  uniform vec3 u_FogColor;
  uniform vec2 u_FogDist;

  varying vec4 v_Color;
  varying float v_Dist;

  void main() {
    float fogFactor = clamp((u_FogDist[1] - v_Dist) / (u_FogDist[1] - u_FogDist[0]), 0.0, 1.0);
    vec3 color = mix(u_FogColor, v_Color.rgb, fogFactor);
    gl_FragColor = vec4(color, v_Color.a);
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
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uFogColor = gl.getUniformLocation(program, "u_FogColor");
const uFogDist = gl.getUniformLocation(program, "u_FogDist");

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
 * Setups for color, for distance and eye position
 */
const eye = new Float32Array([25, 65, 35, 1.0]);
const fogColor = new Float32Array([0.137, 0.231, 0.423]);
gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);
gl.uniform3fv(uFogColor, fogColor);
const fogStartInput = document.getElementById("fogStart");
const fogOffsetInput = document.getElementById("fogOffset");
const setFogDistance = () => {
  const start = parseFloat(fogStartInput.value);
  const stop = start + parseFloat(fogOffsetInput.value);
  const fogDist = new Float32Array([start, stop]);
  gl.uniform2fv(uFogDist, fogDist);
};
fogStartInput.addEventListener("input", () => {
  setFogDistance();
});
fogOffsetInput.addEventListener("input", () => {
  setFogDistance();
});
setFogDistance();

/**
 * Setups model view projection matrix
 */
const projMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(eye[0], eye[1], eye[2]),
  vec3.fromValues(0, 2, 0),
  vec3.fromValues(0, 1, 0)
);
const modelMatrix = mat4.fromScaling(mat4.create(), vec3.fromValues(10, 10, 10));
const mvpMatrix = mat4.create();
const setProjMatrix = () => {
  mat4.perspective(projMatrix, glMatrix.toRadian(30), gl.canvas.width / gl.canvas.height, 1, 1000);
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

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  requestAnimationFrame(render);
};
requestAnimationFrame(render);

getCanvasResizeObserver(() => {
  setProjMatrix();
  render();
});
