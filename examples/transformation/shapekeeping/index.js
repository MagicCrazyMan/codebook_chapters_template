import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const gl = getWebGLContext();

const vertexShader = `
  attribute vec4 a_Position;
  uniform mat4 u_Scale;

  void main() {
    gl_Position = u_Scale * a_Position;
  }
`;
const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups buffer
 */
const [aPosition] = bindWebGLBuffer(gl, program, ["a_Position"]);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    0, 0.5, -0.43301270189221935, -0.24999999999999997, 0.43301270189221935, -0.24999999999999997,
  ]),
  gl.STATIC_DRAW
);

/**
 * Calculates scaling matrix to keep the shape of triangle.
 * In this example, scale base on X axis
 */
const uScale = gl.getUniformLocation(program, "u_Scale");
const setScalingMatrix = () => {
  const width = gl.canvas.width;
  const height = gl.canvas.height;
  // prettier-ignore
  const matrix = new Float32Array([
    1,              0, 0, 0,
    0, width / height, 0, 0,
    0,              0, 1, 0,
    0,              0, 0, 1,
  ])
  gl.uniformMatrix4fv(uScale, false, matrix);
};
/**
 * Function below do the same job as above, but base on Y axis. 
 */
// const setScalingMatrix = () => {
//   const width = gl.canvas.width;
//   const height = gl.canvas.height;
//   // prettier-ignore
//   const matrix = new Float32Array([
//     height / width, 0, 0, 0,
//     0,              1, 0, 0,
//     0,              0, 1, 0,
//     0,              0, 0, 1,
//   ])
//   gl.uniformMatrix4fv(uScale, false, matrix);
// };

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

getCanvasResizeObserver(() => {
  setScalingMatrix();
  render();
});
render();
