import { glMatrix, mat4, vec3 } from "gl-matrix";
import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  
  void main() {
    gl_Position = u_ModelMatrix * a_Position;
  }
`;
const fragmentShader = `
  precision mediump float;

  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups buffer
 */
const [aPosition] = bindWebGLBuffer(gl, program, ["a_Position"]);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    0, 0.5, -0.43301270189221935, -0.24999999999999997, 0.43301270189221935, -0.24999999999999997,
  ]),
  gl.STATIC_DRAW
);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

/**
 * Setups rotation matrix
 */
const rotationInputs = [
  document.getElementById("yaw"),
  document.getElementById("pitch"),
  document.getElementById("roll"),
];

/**
 * Setups translation matrix
 */
const translationInputs = [
  document.getElementById("tx"),
  document.getElementById("ty"),
  document.getElementById("tz"),
];

/**
 * Setups scale matrix
 */
const scaleInputs = [
  document.getElementById("sx"),
  document.getElementById("sy"),
  document.getElementById("sz"),
];

[...rotationInputs, ...translationInputs, ...scaleInputs].forEach((input) => {
  input.addEventListener("input", () => {
    setModelMatrix();
    render();
  });
});

/**
 * Setups model matrix and pass to webgl
 */
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const setModelMatrix = () => {
  const matrix = mat4.create();

  // multiply scale matrix, with shape keeping
  const width = gl.canvas.width;
  const height = gl.canvas.height;
  mat4.scale(
    matrix,
    matrix,
    vec3.fromValues(
      scaleInputs[0].value,
      (width / height) * scaleInputs[1].value,
      scaleInputs[2].value
    )
  );

  // multiply translation matrix
  mat4.translate(
    matrix,
    matrix,
    vec3.fromValues(
      translationInputs[0].value,
      translationInputs[1].value,
      translationInputs[2].value
    )
  );

  // multiply rotation matrix
  mat4.rotateZ(matrix, matrix, glMatrix.toRadian(rotationInputs[0].value));
  mat4.rotateY(matrix, matrix, glMatrix.toRadian(rotationInputs[1].value));
  mat4.rotateX(matrix, matrix, glMatrix.toRadian(rotationInputs[2].value));

  gl.uniformMatrix4fv(uModelMatrix, false, matrix);
};
setModelMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

getCanvasResizeObserver(() => {
  setModelMatrix();
  render();
});
render();
