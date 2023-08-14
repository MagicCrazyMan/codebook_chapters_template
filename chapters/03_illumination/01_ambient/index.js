import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  // reflection of ambient light
  attribute vec3 a_AmbientReflection;

  uniform mat4 u_MvpMatrix;
  // ambient light color
  uniform vec3 u_AmbientLight;

  varying vec3 v_Color;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Color = a_AmbientReflection * u_AmbientLight;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec3 v_Color;

  void main() {
    gl_FragColor = vec4(v_Color, 1.0);
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
const rps = glMatrix.toRadian(20); // Radian Per Second
let lastAnimationTime = 0;
let currentRotation = 0;
const modelMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(3, 3, 7),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
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
  lastAnimationTime = time;
};
const setMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projectionMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
getCanvasResizeObserver(() => {
  setProjectionMatrix();
});

/**
 * Setups diffuse light direction
 */
const uLightDirection = gl.getUniformLocation(program, "u_LightDirection");
const lightDirection = vec3.fromValues(0.5, 3.0, 4.0); // sets light direction
vec3.normalize(lightDirection, lightDirection); // must normalize the light direction
gl.uniform3fv(uLightDirection, lightDirection);

/**
 * Setups ambient light
 */
const uAmbientLight = gl.getUniformLocation(program, "u_AmbientLight");
const ambientInputs = [
  document.getElementById("ambientColorR"),
  document.getElementById("ambientColorG"),
  document.getElementById("ambientColorB"),
];
ambientInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setAmbientLightColor();
  });
});
const setAmbientLightColor = () => {
  gl.uniform3f(
    uAmbientLight,
    parseFloat(ambientInputs[0].value),
    parseFloat(ambientInputs[1].value),
    parseFloat(ambientInputs[2].value)
  );
};
setAmbientLightColor();

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
const aPosition = gl.getAttribLocation(program, "a_Position");
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);

// prettier-ignore
const ambientReflections = new Float32Array([
  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front(blue)
  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right(green)
  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up(red)
  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left(yellow)
  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 bottom(white)
  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back(cyan)
]);
const ambientReflectionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, ambientReflectionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, ambientReflections, gl.STATIC_DRAW);
const aAmbientReflection = gl.getAttribLocation(program, "a_AmbientReflection");
gl.vertexAttribPointer(aAmbientReflection, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aAmbientReflection);

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
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
const render = (time) => {
  setModelMatrix(time);
  setMvpMatrix();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  requestAnimationFrame(render);
};
render(0);
