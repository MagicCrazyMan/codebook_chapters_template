import { mat4, vec3 } from "gl-matrix";
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
  uniform mat4 u_ShapeKeepingMatrix;
  uniform mat4 u_ViewMatrix;

  void main() {
    gl_Position = u_ShapeKeepingMatrix * u_ViewMatrix * a_Position;
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
 * Setups shape keeping
 */
const uShapeKeepingMatrix = gl.getUniformLocation(program, "u_ShapeKeepingMatrix");
const shapeKeepingMatrix = mat4.fromScaling(
  mat4.create(),
  vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1)
);
gl.uniformMatrix4fv(uShapeKeepingMatrix, false, shapeKeepingMatrix);
getCanvasResizeObserver(() => {
  gl.uniformMatrix4fv(
    uShapeKeepingMatrix,
    false,
    mat4.fromScaling(shapeKeepingMatrix, vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1))
  );
  render();
});

/**
 * Setups view matrix
 */
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
const uViewMatrix = gl.getUniformLocation(program, "u_ViewMatrix");
const setViewMatrix = () => {
  mat4.lookAt(
    viewMatrix,
    vec3.fromValues(eyeInputs[0].value, eyeInputs[1].value, eyeInputs[2].value),
    vec3.fromValues(targetInputs[0].value, targetInputs[1].value, targetInputs[2].value),
    vec3.fromValues(upInputs[0].value, upInputs[1].value, upInputs[2].value)
  );

  gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
};
[...eyeInputs, ...targetInputs, ...upInputs].forEach((input) => {
  input.addEventListener("input", () => {
    setViewMatrix();
    render();
  });
});
setViewMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 9);
};
render();
