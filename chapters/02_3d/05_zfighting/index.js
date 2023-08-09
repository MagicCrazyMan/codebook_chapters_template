import { glMatrix, mat4, quat, vec3 } from "gl-matrix";
import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  uniform mat4 u_ModelViewProjectionMatrix;
  varying vec4 v_Color;

  void main() {
    gl_Position = u_ModelViewProjectionMatrix * a_Position;
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
const [aPosition, aColor] = bindWebGLBuffer(gl, program, ["a_Position", "a_Color"]);

/**
 * Setups vertices and colors
 */
// prettier-ignore
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    // triangle 0
     0.0,  2.5, -5.0,
    -2.5, -2.5, -5.0,
     2.5, -2.5, -5.0,
    // triangle 1
     0.0,  3.0, -5.0,
    -3.0, -3.0, -5.0,
     3.0, -3.0, -5.0,
     // triangle 0, green
     0.4, 1.0, 0.4,
     0.4, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle 1, yellow
     1.0, 0.4, 0.4,
     1.0, 1.0, 0.4,
     1.0, 1.0, 0.4,
  ]),
  gl.STATIC_DRAW
);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 18);

/**
 * Setups projection model view matrix
 */
const uModelViewProjectionMatrix = gl.getUniformLocation(program, "u_ModelViewProjectionMatrix");
const setModelViewProjectionMatrix = () => {
  const projectionMatrix = mat4.perspective(
    mat4.create(),
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
  const viewMatrix = mat4.lookAt(
    mat4.create(),
    vec3.fromValues(3.06, 2.5, 10),
    vec3.fromValues(0, 0, -2),
    vec3.fromValues(0, 1, 0)
  );
  const modelMatrix = mat4.fromRotationTranslationScale(
    mat4.create(),
    quat.fromEuler(quat.create(), 0, 0, 0),
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(1, 1, 1)
  );
  const modelViewProjectionMatrix = mat4.create();
  mat4.identity(modelViewProjectionMatrix);
  mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, projectionMatrix);
  mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, viewMatrix);
  mat4.multiply(modelViewProjectionMatrix, modelViewProjectionMatrix, modelMatrix);
  gl.uniformMatrix4fv(uModelViewProjectionMatrix, false, modelViewProjectionMatrix);
};
setModelViewProjectionMatrix();
getCanvasResizeObserver(() => {
  setModelViewProjectionMatrix();
  render();
});

/**
 * Setups polygon offset
 */
gl.enable(gl.DEPTH_TEST);
const polygonOffsetCheckbox = document.getElementById("polygonOffset");
polygonOffsetCheckbox.addEventListener("change", () => {
  render();
});

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (polygonOffsetCheckbox.checked) {
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.polygonOffset(1, 1);
    gl.drawArrays(gl.TRIANGLES, 3, 3);
  } else {
    gl.disable(gl.POLYGON_OFFSET_FILL);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
};
render();
