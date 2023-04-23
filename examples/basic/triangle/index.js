import {
  bingWebGLBuffer,
  getCanvasResizeObserver,
  getWebGLContext,
  setupWebGL,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  void main() {
    gl_Position = a_Position;
  }
`;
const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const gl = getWebGLContext();
const program = setupWebGL(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);
const [aPosition] = bingWebGLBuffer(gl, program, ["a_Position"]);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

/**
 * Setups draw mode selector
 */
/**@enum {GLenum} */
const Mode = {
  Triangles: gl.TRIANGLES,
  TriangleFan: gl.TRIANGLE_FAN,
  TriangleStrip: gl.TRIANGLE_STRIP,
};
const selector = document.getElementById("selector");
let activeMode = Mode[selector.value];
selector.addEventListener("change", (e) => {
  activeMode = Mode[e.target.value];
  render();
});

/**
 * Setups buffer data
 */
const buffer = new Float32Array([-0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, -0.5]);
gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.DYNAMIC_DRAW);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(activeMode, 0, buffer.length / 2);
};

getCanvasResizeObserver(render);
render();
