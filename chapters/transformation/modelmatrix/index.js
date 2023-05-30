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
  uniform mat4 u_ShapeKeepingMatrix;
  
  void main() {
    gl_Position = u_ShapeKeepingMatrix * u_ModelMatrix * a_Position;
  }
`;
const fragmentShader = `
  #ifdef GL_ES
    precision mediump float;
  #endif

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
 * Setups shape keeping matrix
 */
const uShapeKeepingMatrix = gl.getUniformLocation(program, "u_ShapeKeepingMatrix");
gl.uniformMatrix4fv(
  uShapeKeepingMatrix,
  false,
  mat4.fromScaling(mat4.create(), vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1))
);

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
  const modelMatrix = mat4.identity(mat4.create());

  // multiply translation matrix
  mat4.translate(
    modelMatrix,
    modelMatrix,
    vec3.fromValues(
      parseFloat(translationInputs[0].value),
      parseFloat(translationInputs[1].value),
      parseFloat(translationInputs[2].value)
    )
  );
  // multiply rotation matrix
  mat4.rotateZ(modelMatrix, modelMatrix, glMatrix.toRadian(parseFloat(rotationInputs[0].value)));
  mat4.rotateY(modelMatrix, modelMatrix, glMatrix.toRadian(parseFloat(rotationInputs[1].value)));
  mat4.rotateX(modelMatrix, modelMatrix, glMatrix.toRadian(parseFloat(rotationInputs[2].value)));
  // multiply scale matrix
  mat4.scale(
    modelMatrix,
    modelMatrix,
    vec3.fromValues(
      parseFloat(scaleInputs[0].value),
      parseFloat(scaleInputs[1].value),
      parseFloat(scaleInputs[2].value)
    )
  );

  // code commented below do the same job
  // mat4.fromRotationTranslationScale(
  //   modelMatrix,
  //   quat.fromEuler(
  //     quat.create(),
  //     parseFloat(rotationInputs[2].value),
  //     parseFloat(rotationInputs[1].value),
  //     parseFloat(rotationInputs[0].value)
  //   ),
  //   vec3.fromValues(
  //     parseFloat(translationInputs[0].value),
  //     parseFloat(translationInputs[1].value),
  //     parseFloat(translationInputs[2].value)
  //   ),
  //   vec3.fromValues(
  //     parseFloat(scaleInputs[0].value),
  //     parseFloat(scaleInputs[1].value),
  //     parseFloat(scaleInputs[2].value)
  //   )
  // );

  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
};
setModelMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

getCanvasResizeObserver(() => {
  gl.uniformMatrix4fv(
    uShapeKeepingMatrix,
    false,
    mat4.fromScaling(mat4.create(), vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1))
  );
  render();
});
render();
