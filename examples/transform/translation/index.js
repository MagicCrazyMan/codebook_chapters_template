import {
  bindWebGLProgram,
  bindWebGLBuffer,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const gl = getWebGLContext();

const vertexShader = `
  attribute vec4 a_Position;
  uniform mat4 u_Translation;

  void main() {
    gl_Position = u_Translation * a_Position;
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
 * Setups translation inputs
 */
const uTranslation = gl.getUniformLocation(program, "u_Translation");
const inputs = [
  document.getElementById("tx"),
  document.getElementById("ty"),
  document.getElementById("tz"),
];
const setTranslationMatrix = () => {
  const tx = parseFloat(inputs[0].value);
  const ty = parseFloat(inputs[1].value);
  const tz = parseFloat(inputs[2].value);
  // IMPORTANT, in webgl, matrix data orders in COLUMN major
  // prettier-ignore
  gl.uniformMatrix4fv(uTranslation, false, [
    1,  0,  0,  0,
    0,  1,  0,  0,
    0,  0,  1,  0,
    tx, ty, tz, 1,
  ]);
};
inputs.forEach((input) => {
  input.addEventListener("input", () => {
    setTranslationMatrix();
    render();
  });
});
setTranslationMatrix();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

getCanvasResizeObserver(render);
render();
