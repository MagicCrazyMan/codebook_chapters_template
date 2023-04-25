import {
  bindWebGLProgram,
  bindWebGLBuffer,
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
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0.5, -0.5, -0.5, 0.5, -0.5]), gl.STATIC_DRAW);

/**
 * Setups rotation inputs
 */
const uScale = gl.getUniformLocation(program, "u_Scale");
const setRotationAngles = (sx, sy, sz) => {
  // prettier-ignore
  gl.uniformMatrix4fv(uScale, false, [
    sx, 0,  0, 0,
    0, sy,  0, 0,
    0,  0, sz, 0,
    0,  0,  0, 1,
  ]);
};
const inputs = [
  document.getElementById("sx"),
  document.getElementById("sy"),
  document.getElementById("sz"),
];
inputs.forEach((input) => {
  input.addEventListener("input", () => {
    setRotationAngles(inputs[0].value, inputs[1].value, inputs[2].value);
    render();
  });
});
setRotationAngles(inputs[0].value, inputs[1].value, inputs[2].value);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

getCanvasResizeObserver(render);
render();
