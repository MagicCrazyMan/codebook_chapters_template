import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;

  void main() {
    gl_Position = a_Position;
    gl_PointSize = 1.0;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
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
const aPosition = gl.getAttribLocation(program, "a_Position");

/**
 * Setups data
 */
const countInput = document.getElementById("count");
countInput.addEventListener("input", () => {
  loadSierpinski();
  render();
});
let vertices = null;
const buffer = gl.createBuffer();
const loadSierpinski = () => {
  /**
   * Creates Sierpinski vertices
   * @param {number} count
   * @returns Sierpinski vertices
   */
  const createSierpinski = (count) => {
    const points = [
      [0.0, 1.0, 0.0],
      [1.0, -1.0, 0.0],
      [-1.0, -1.0, 0.0],
    ];

    const vertices = new Float32Array(count * 3);
    let p = points[Math.floor(Math.random() * points.length)];
    for (let i = 0; i < count; i++) {
      const r = points[Math.floor(Math.random() * points.length)];
      const q = [(p[0] + r[0]) / 2, (p[1] + r[1]) / 2, 0];
      vertices.set(q, i * 3);
      p = q;
    }

    return vertices;
  };

  vertices = createSierpinski(parseInt(countInput.value));
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);
};
loadSierpinski();

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS, 0, vertices.length / 3);
};

getCanvasResizeObserver(render);
render();
