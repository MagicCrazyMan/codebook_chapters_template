import { mat4, quat, vec3, glMatrix } from "gl-matrix";
import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 v_Color;

  uniform mat4 u_ModelViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ModelViewMatrix * a_Position;
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
    // triangle left 0 vertices
    -0.75,  1.0, -4.0,
    -1.25, -1.0, -4.0,
    -0.25, -1.0, -4.0,
    // triangle left 1 vertices
    -0.75,  1.0, -2.0,
    -1.25, -1.0, -2.0,
    -0.25, -1.0, -2.0,
    // triangle left 2 vertices
    -0.75,  1.0,  0.0,
    -1.25, -1.0,  0.0,
    -0.25, -1.0,  0.0,
    // triangle right 0 vertices
     0.75,  1.0, -4.0,
     1.25, -1.0, -4.0,
     0.25, -1.0, -4.0,
    // triangle right 1 vertices
     0.75,  1.0, -2.0,
     1.25, -1.0, -2.0,
     0.25, -1.0, -2.0,
    // triangle right 2 vertices
     0.75,  1.0,  0.0,
     1.25, -1.0,  0.0,
     0.25, -1.0,  0.0,
     // triangle left 0 color, green
     0.4, 1.0, 0.4,
     0.4, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle left 1 color, yellow
     1.0, 1.0, 0.4,
     1.0, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle left 2 color, blue
     0.4, 0.4, 1.0,
     0.4, 0.4, 1.0,
     1.0, 0.4, 0.4,
     // triangle right 0 color, green
     0.4, 1.0, 0.4,
     0.4, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle right 1 color, yellow
     1.0, 1.0, 0.4,
     1.0, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle right 2 color, blue
     0.4, 0.4, 1.0,
     0.4, 0.4, 1.0,
     1.0, 0.4, 0.4,
  ]),
  gl.STATIC_DRAW
);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 54);

/**
 * Setups model view matrix
 */
const rotationInputs = [
  document.getElementById("yaw"),
  document.getElementById("pitch"),
  document.getElementById("roll"),
];
const translationInputs = [
  document.getElementById("tx"),
  document.getElementById("ty"),
  document.getElementById("tz"),
];
const scaleInputs = [
  document.getElementById("sx"),
  document.getElementById("sy"),
  document.getElementById("sz"),
];
const eyeInputs = [
  document.getElementById("eyeX"),
  document.getElementById("eyeY"),
  document.getElementById("eyeZ"),
];
const targetInputs = [
  document.getElementById("atX"),
  document.getElementById("atY"),
  document.getElementById("atZ"),
];
const upInputs = [
  document.getElementById("upX"),
  document.getElementById("upY"),
  document.getElementById("upZ"),
];
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const uModelViewMatrix = gl.getUniformLocation(program, "u_ModelViewMatrix");
const setModelViewMatrix = () => {
  // Calculates view matrix
  mat4.lookAt(
    viewMatrix,
    vec3.fromValues(eyeInputs[0].value, eyeInputs[1].value, eyeInputs[2].value),
    vec3.fromValues(targetInputs[0].value, targetInputs[1].value, targetInputs[2].value),
    vec3.fromValues(upInputs[0].value, upInputs[1].value, upInputs[2].value)
  );
  // Calculates model matrix
  mat4.fromRotationTranslationScale(
    modelMatrix,
    quat.fromEuler(
      quat.create(),
      rotationInputs[2].value,
      rotationInputs[1].value,
      rotationInputs[0].value
    ),
    vec3.fromValues(
      translationInputs[0].value,
      translationInputs[1].value,
      translationInputs[2].value
    ),
    vec3.fromValues(scaleInputs[0].value, scaleInputs[1].value, scaleInputs[2].value)
  );

  // Calculates all in one view model matrix
  mat4.identity(modelViewMatrix);
  mat4.multiply(modelViewMatrix, modelViewMatrix, viewMatrix);
  mat4.multiply(modelViewMatrix, modelViewMatrix, modelMatrix);

  gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);
};
[
  ...rotationInputs,
  ...translationInputs,
  ...scaleInputs,
  ...eyeInputs,
  ...targetInputs,
  ...upInputs,
].forEach((input) => {
  input.addEventListener("input", () => {
    setModelViewMatrix();
    render();
  });
});
setModelViewMatrix();

/**
 * Setups perspective projection
 */
const projectionInputs = [
  document.getElementById("fov"),
  document.getElementById("near"),
  document.getElementById("far"),
];
const projectionMatrix = mat4.create();
const uProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(parseFloat(projectionInputs[0].value)),
    gl.canvas.width / gl.canvas.height,
    parseFloat(projectionInputs[1].value),
    parseFloat(projectionInputs[2].value)
  );
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
};
projectionInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setProjectionMatrix();
    render();
  });
});
setProjectionMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 18);
};
getCanvasResizeObserver(() => {
  setProjectionMatrix();
  render();
});
render();
