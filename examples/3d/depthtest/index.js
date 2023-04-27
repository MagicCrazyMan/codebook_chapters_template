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
  varying vec4 v_Color;

  uniform mat4 u_ModelViewMatrix;
  uniform mat4 u_ProjectionMatrix;

  void main() {
    gl_Position = u_ProjectionMatrix * u_ModelViewMatrix * a_Position;
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
    // triangle left 0 vertices
    -0.75,  1.0,  0.0,
    -1.25, -1.0,  0.0,
    -0.25, -1.0,  0.0,
    // triangle left 1 vertices
    -0.75,  1.0, -2.0,
    -1.25, -1.0, -2.0,
    -0.25, -1.0, -2.0,
    // triangle left 2 vertices
    -0.75,  1.0, -4.0,
    -1.25, -1.0, -4.0,
    -0.25, -1.0, -4.0,
    // triangle right 0 vertices
     0.75,  1.0,  0.0,
     1.25, -1.0,  0.0,
     0.25, -1.0,  0.0,
    // triangle right 1 vertices
     0.75,  1.0, -2.0,
     1.25, -1.0, -2.0,
     0.25, -1.0, -2.0,
    // triangle right 2 vertices
     0.75,  1.0, -4.0,
     1.25, -1.0, -4.0,
     0.25, -1.0, -4.0,
     // triangle left 0 color, green
     0.4, 0.4, 1.0,
     0.4, 0.4, 1.0,
     1.0, 0.4, 0.4,
     // triangle left 1 color, yellow
     1.0, 1.0, 0.4,
     1.0, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle left 2 color, blue
     0.4, 1.0, 0.4,
     0.4, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle right 0 color, green
     0.4, 0.4, 1.0,
     0.4, 0.4, 1.0,
     1.0, 0.4, 0.4,
     // triangle right 1 color, yellow
     1.0, 1.0, 0.4,
     1.0, 1.0, 0.4,
     1.0, 0.4, 0.4,
     // triangle right 2 color, blue
     0.4, 1.0, 0.4,
     0.4, 1.0, 0.4,
     1.0, 0.4, 0.4,
  ]),
  gl.STATIC_DRAW
);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 54);

/**
 * Setups model view matrix
 */
const uModelViewMatrix = gl.getUniformLocation(program, "u_ModelViewMatrix");
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(0, 0, 5),
  vec3.fromValues(0, 0, -100),
  vec3.fromValues(0, 1, 0)
);
const modelMatrix = mat4.fromRotationTranslationScale(
  mat4.create(),
  quat.fromEuler(quat.create(), 0, 0, 0),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(1, 1, 1)
);
const modelViewMatrix = mat4.create();
mat4.identity(modelViewMatrix);
mat4.multiply(modelViewMatrix, modelViewMatrix, viewMatrix);
mat4.multiply(modelViewMatrix, modelViewMatrix, modelMatrix);
gl.uniformMatrix4fv(uModelViewMatrix, false, modelViewMatrix);

/**
 * Setups perspective projection
 */
const projectionMatrix = mat4.create();
const uProjectionMatrix = gl.getUniformLocation(program, "u_ProjectionMatrix");
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
  gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
};
setProjectionMatrix();
getCanvasResizeObserver(() => {
  setProjectionMatrix();
  render();
});

/**
 * Setups depth testing
 */
/**@type {HTMLInputElement} */
const depthTestCheckbox = document.getElementById("depthTest");
let enableDepthTest = depthTestCheckbox.checked ?? false;
const setDepthTest = () => {
  if (enableDepthTest) {
    gl.enable(gl.DEPTH_TEST);
  } else {
    gl.disable(gl.DEPTH_TEST);
  }
};
depthTestCheckbox.addEventListener("change", () => {
  enableDepthTest = depthTestCheckbox.checked ?? false;
  setDepthTest();
  render();
});
setDepthTest();

const render = () => {
  if (enableDepthTest) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  } else {
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  gl.drawArrays(gl.TRIANGLES, 0, 18);
};
render();
