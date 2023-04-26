import { mat4, quat, vec3 } from "gl-matrix";
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

  void main() {
    gl_Position = u_ModelViewMatrix * a_Position;
    v_Color = a_Color;
  }
`;
const fragmentShader = `  
  precision mediump float;
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
    // triangle 0 vertices
                       0,                  0.5, -0.4,
    -0.43301270189221935, -0.24999999999999997, -0.4,
     0.43301270189221935, -0.24999999999999997, -0.4,
    // triangle 1 vertices
                       0,                 -0.5, -0.2,
     0.43301270189221935,  0.24999999999999997, -0.2,
    -0.43301270189221935,  0.24999999999999997, -0.2,
    // triangle 2 vertices
                       0,                  0.5,  0.0,
    -0.43301270189221935, -0.24999999999999997,  0.0,
     0.43301270189221935, -0.24999999999999997,  0.0,
     // triangle 0 color, green
     1.0, 0.4, 0.4,
     0.4, 1.0, 0.4,
     0.4, 1.0, 0.4,
     // triangle 1 color, yellow
     1.0, 0.4, 0.4,
     1.0, 1.0, 0.4,
     1.0, 1.0, 0.4,
     // triangle 2 color, blue
     1.0, 0.4, 0.4,
     0.4, 0.4, 1.0,
     0.4, 0.4, 1.0,
  ]),
  gl.STATIC_DRAW
);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 27);

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
const shapeKeepingMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();
const modelViewMatrix = mat4.create();
const uViewModelMatrix = gl.getUniformLocation(program, "u_ModelViewMatrix");
const setViewModelMatrix = () => {
  // Calculates shape keeping matrix
  mat4.fromScaling(shapeKeepingMatrix, vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1));
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
  mat4.multiply(modelViewMatrix, modelViewMatrix, shapeKeepingMatrix);
  mat4.multiply(modelViewMatrix, modelViewMatrix, viewMatrix);
  mat4.multiply(modelViewMatrix, modelViewMatrix, modelMatrix);

  gl.uniformMatrix4fv(uViewModelMatrix, false, modelViewMatrix);
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
    setViewModelMatrix();
    render();
  });
});
setViewModelMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 9);
};
getCanvasResizeObserver(() => {
  setViewModelMatrix();
  render();
});
render();
