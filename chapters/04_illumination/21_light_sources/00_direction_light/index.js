import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  attribute vec4 a_Normal;

  uniform mat4 u_MvpMatrix;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec4 v_Color;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = vec3(u_NormalMatrix * a_Normal);
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec3 u_LightColor;
  uniform vec3 u_LightDirection;

  varying vec4 v_Color;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  void main() {
    vec3 normal = normalize(v_Normal);

    // calculates cosine between light and normal
    float dotLightNormal = dot(normal, -1.0 * u_LightDirection);

    // calculates direction light
    float directionPower = clamp(dotLightNormal, 0.0, 1.0);
    vec3 directionColor = v_Color.rgb * u_LightColor * directionPower;

    gl_FragColor = vec4(directionColor , v_Color.a);
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups mvp and normal matrix
 */
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const uNormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
const uLightDirection = gl.getUniformLocation(program, "u_LightDirection");
const rps = glMatrix.toRadian(20); // Radian Per Second
let lastAnimationTime = 0;
let currentRotation = 0;
const modelMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(6, 6, 14),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
const normalMatrix = mat4.create();
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
};
const setModelMatrix = (time) => {
  currentRotation += ((time - lastAnimationTime) / 1000) * rps;
  currentRotation %= 2 * Math.PI;
  mat4.fromYRotation(modelMatrix, currentRotation);
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
};
const setMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projectionMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
const setNormalMatrix = () => {
  mat4.invert(normalMatrix, modelMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
  gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
};
getCanvasResizeObserver(() => {
  setProjectionMatrix();
  setMvpMatrix();
});

/**
 * Setups cube normals
 */
// prettier-ignore
const normals = new Float32Array([
  0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
  1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
  0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
 -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
  0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
  0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
]);
const normalsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
const uNormals = gl.getAttribLocation(program, "a_Normal");
gl.vertexAttribPointer(uNormals, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(uNormals);

/**
 * Setups light color
 */
const uLightColor = gl.getUniformLocation(program, "u_LightColor");
const lightColorInputs = [
  document.getElementById("colorR"),
  document.getElementById("colorG"),
  document.getElementById("colorB"),
];
lightColorInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setLightColor();
  });
});
const setLightColor = () => {
  gl.uniform3f(
    uLightColor,
    parseFloat(lightColorInputs[0].value),
    parseFloat(lightColorInputs[1].value),
    parseFloat(lightColorInputs[2].value)
  );
};
setLightColor();
/**
 * Setups light direction
 */
const lightDirection = vec3.fromValues(10, -10, 0);
vec3.normalize(lightDirection, lightDirection);
gl.uniform3fv(uLightDirection, lightDirection);

/**
 * Setups cube
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
  2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0,  // v0-v1-v2-v3 front
  2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0,  // v0-v3-v4-v5 right
  2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0,  // v0-v5-v6-v1 up
 -2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0,  // v1-v6-v7-v2 left
 -2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0,  // v7-v4-v3-v2 down
  2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0   // v4-v7-v6-v5 back
]);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, "a_Position");
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
const aColor = gl.getAttribLocation(program, "a_Color");
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

gl.enable(gl.DEPTH_TEST);
const render = (time) => {
  setModelMatrix(time);
  setNormalMatrix();
  setMvpMatrix();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  requestAnimationFrame(render);
  lastAnimationTime = time;
};
render(0);
