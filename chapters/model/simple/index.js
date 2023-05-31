import { glMatrix, mat4, vec3 } from "gl-matrix";
import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec3 a_Color;
  attribute vec4 a_Normal;

  uniform mat4 u_MvpMatrix;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec3 v_Position;
  varying vec3 v_Color;
  varying vec3 v_Normal;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = vec3(u_NormalMatrix * a_Normal);
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_ES
    precision mediump float;
  #endif

  vec3 lightPosition = vec3(10.0, 25.0, 10.0);
  vec3 lightColor = vec3(1.0, 1.0, 1.0);
  vec3 ambientColor = vec3(0.2, 0.2, 0.2);

  varying vec3 v_Position;
  varying vec3 v_Color;
  varying vec3 v_Normal;

  void main() {
    vec3 lightDirection = normalize(lightPosition - v_Position);
    vec3 normal = normalize(v_Normal);
    float incidence = max(dot(lightDirection, normal), 0.0);
    vec3 diffuse = v_Color * lightColor * incidence;
    vec3 ambient = v_Color * ambientColor;
    gl_FragColor = vec4(diffuse + ambient, 1.0);
    // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);

const program = bindWebGLProgram(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);

/**
 * Setups models
 *   v5----v4
 *  / |   / |
 * v1----v0 |
 * |  |  |  |
 * |  |  |  |
 * |  |  |  |
 * |  v6-|--|v7
 * | /   | /
 * v2----v3
 */
const arm1Length = 10;
// prettier-ignore
const modelData = new Float32Array([
  // vertices
   1.5,arm1Length, 1.5,  -1.5,arm1Length, 1.5,  -1.5,       0.0, 1.5,   1.5,       0.0, 1.5, // v0-v1-v2-v3 front
   1.5,arm1Length,-1.5,   1.5,arm1Length, 1.5,   1.5,       0.0, 1.5,   1.5,       0.0,-1.5, // v4-v0-v3-v7 right
  -1.5,arm1Length, 1.5,  -1.5,arm1Length,-1.5,  -1.5,       0.0,-1.5,  -1.5,       0.0, 1.5, // v1-v5-v6-v2 left
   1.5,       0.0,-1.5,  -1.5,       0.0,-1.5,  -1.5,arm1Length,-1.5,   1.5,arm1Length,-1.5, // v7-v6-v5-b4 back
   1.5,arm1Length, 1.5,  -1.5,arm1Length, 1.5,  -1.5,arm1Length,-1.5,   1.5,arm1Length,-1.5, // v0-v1-v5-v4 top
   1.5,       0.0, 1.5,  -1.5,       0.0, 1.5,  -1.5,       0.0,-1.5,   1.5,       0.0,-1.5, // v3-v2-v6-v7 bottom
   // colors
   0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  // front(blue)
   0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  // right(green)
   1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  // left(red)
   1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  // back(yellow)
   1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  // top(white)
   0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  // bottom(cyan)
   // normals
   0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1, // front
   1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0, // right
  -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0, // left
   0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1, // back
   0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0, // top
   0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0, // bottom
]);
const [aPosition, aColor, aNormal] = bindWebGLBuffer(gl, program, [
  "a_Position",
  "a_Color",
  "a_Normal",
]);
gl.bufferData(gl.ARRAY_BUFFER, modelData, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 3 * 4 * 6 * Float32Array.BYTES_PER_ELEMENT);
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 3 * 4 * 12 * Float32Array.BYTES_PER_ELEMENT);
// prettier-ignore
const indices = new Uint8Array([
   0,  1,  2,  0,  2,  3, // front
   4,  5,  6,  4,  6,  7, // right
   8,  9, 10,  8, 10, 11, // left
  12, 13, 14, 12, 14, 15, // back
  16, 17, 18, 16, 18, 19, // top
  20, 21, 22, 20, 22, 23, // bottom
]);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

/**
 * Setups matrices
 */
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const uNormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
let arm1Rotation = 0;
const arm2Scale = 1.2;
let arm2Rotation = 0;
const viewMatrix = mat4.create();
const projMatrix = mat4.create();
const armMatrices = [
  {
    modelMatrix: mat4.create(),
    normalMatrix: mat4.create(),
    mvpMatrix: mat4.create(),
  },
  {
    modelMatrix: mat4.create(),
    normalMatrix: mat4.create(),
    mvpMatrix: mat4.create(),
  },
];
const setArm1ModelMatrix = () => {
  mat4.fromRotation(armMatrices[0].modelMatrix, arm1Rotation, vec3.fromValues(0, 1, 0));
};
const setArm1NormalMatrix = () => {
  mat4.invert(armMatrices[0].normalMatrix, armMatrices[0].modelMatrix);
  mat4.transpose(armMatrices[0].normalMatrix, armMatrices[0].normalMatrix);
};
const setArm2ModelMatrix = () => {
  mat4.copy(armMatrices[1].modelMatrix, armMatrices[0].modelMatrix);
  mat4.translate(
    armMatrices[1].modelMatrix,
    armMatrices[1].modelMatrix,
    vec3.fromValues(0, arm1Length, 0)
  );
  mat4.rotateX(armMatrices[1].modelMatrix, armMatrices[1].modelMatrix, arm2Rotation);
  mat4.scale(
    armMatrices[1].modelMatrix,
    armMatrices[1].modelMatrix,
    vec3.fromValues(arm2Scale, 1, arm2Scale)
  );
};
const setArm2NormalMatrix = () => {
  mat4.invert(armMatrices[1].normalMatrix, armMatrices[1].modelMatrix);
  mat4.transpose(armMatrices[1].normalMatrix, armMatrices[1].normalMatrix);
};
const setViewMatrix = () => {
  mat4.lookAt(
    viewMatrix,
    vec3.fromValues(30, arm1Length * 2.5, 20),
    vec3.fromValues(0, arm1Length, 0),
    vec3.fromValues(0, 1, 0)
  );
};
const setProjectionMatrix = () => {
  mat4.perspective(projMatrix, glMatrix.toRadian(50), gl.canvas.width / gl.canvas.height, 1, 100);
};
const setArm1MvpMatrix = () => {
  mat4.identity(armMatrices[0].mvpMatrix);
  mat4.multiply(armMatrices[0].mvpMatrix, armMatrices[0].mvpMatrix, projMatrix);
  mat4.multiply(armMatrices[0].mvpMatrix, armMatrices[0].mvpMatrix, viewMatrix);
  mat4.multiply(armMatrices[0].mvpMatrix, armMatrices[0].mvpMatrix, armMatrices[0].modelMatrix);
};
const setArm2MvpMatrix = () => {
  mat4.identity(armMatrices[1].mvpMatrix);
  mat4.multiply(armMatrices[1].mvpMatrix, armMatrices[1].mvpMatrix, projMatrix);
  mat4.multiply(armMatrices[1].mvpMatrix, armMatrices[1].mvpMatrix, viewMatrix);
  mat4.multiply(armMatrices[1].mvpMatrix, armMatrices[1].mvpMatrix, armMatrices[1].modelMatrix);
};
setViewMatrix();
setProjectionMatrix();

/**
 * Setups keys control
 */
const ANGLE_STEP_PER_SECOND = glMatrix.toRadian(100);
const pressingKeys = new Set();
document.addEventListener("keydown", ({ key }) => {
  pressingKeys.add(key);
});
document.addEventListener("keyup", ({ key }) => {
  pressingKeys.delete(key);
});

/**
 * Setups render
 */
const renderBox = (index) => {
  const { modelMatrix, normalMatrix, mvpMatrix } = armMatrices[index];
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
  gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);

  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);
};

let lastRenderTime = 0;
const render = (time) => {
  const offset = (time - lastRenderTime) / 1000;
  const angleDelta = offset * ANGLE_STEP_PER_SECOND;
  pressingKeys.forEach((key) => {
    switch (key) {
      case "ArrowLeft":
        pressingKeys.add();
        arm1Rotation -= angleDelta;
        break;
      case "ArrowRight":
        arm1Rotation += angleDelta;
        break;
      case "ArrowDown":
        arm2Rotation -= angleDelta;
        break;
      case "ArrowUp":
        arm2Rotation += angleDelta;
        break;
    }
  });
  arm1Rotation %= Math.PI * 2;
  arm2Rotation = Math.max(Math.min(arm2Rotation, Math.PI * 0.8), -Math.PI * 0.8);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  setArm1ModelMatrix();
  setArm1NormalMatrix();
  setArm1MvpMatrix();
  renderBox(0);

  setArm2ModelMatrix();
  setArm2NormalMatrix();
  setArm2MvpMatrix();
  renderBox(1);

  lastRenderTime = time;
  requestAnimationFrame(render);
};
render(lastRenderTime);

getCanvasResizeObserver(() => {
  setProjectionMatrix();
  render(lastRenderTime);
});

requestAnimationFrame(render);
