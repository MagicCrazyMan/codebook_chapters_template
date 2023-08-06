import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;

  uniform mat4 u_MvpMatrix;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec4 u_Color;

  void main() {
    gl_FragColor = u_Color;
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uColor = gl.getUniformLocation(program, "u_Color");

/**
 * Setups data
 */
let trianglesCount = 0;
let linesCount = 0;
const verticesBuffer = gl.createBuffer();
const trianglesIndicesBuffer = gl.createBuffer();
const linesIndicesBuffer = gl.createBuffer();
const lineColor = vec4.fromValues(1, 0, 0, 1);
const surfaceColor = vec4.fromValues(0, 1, 0, 1);
const loadSombrero = () => {
  /**
   * Creates Sombrero
   * @param {number} width
   * @param {number} height
   * @param {number} resolution
   * @returns Sombrero
   */
  const createSombrero = (width, height, resolution) => {
    const cols = width / resolution;
    const rows = height / resolution;

    const vertices = new Float32Array(rows * cols * 3);
    for (let row = 0; row < rows; row++) {
      const z = (row - rows / 2) * resolution;
      for (let col = 0; col < cols; col++) {
        const x = (col - cols / 2) * resolution;

        const r = Math.hypot(x, z);
        const t = Math.PI * r;
        const y = t !== 0 ? Math.sin(t) / t : 1;

        const index = row * cols + col;
        vertices[index * 3 + 0] = x;
        vertices[index * 3 + 1] = y;
        vertices[index * 3 + 2] = z;
      }
    }

    // triangles
    const trianglesIndices = new Uint32Array(rows * cols * 6);
    // lines
    const linesIndices = new Uint32Array(rows * cols * 8);
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const topLeftIndex = row * cols + col;
        const topRightIndex = topLeftIndex + 1;
        const bottomLeftIndex = (row + 1) * cols + col;
        const bottomRightIndex = bottomLeftIndex + 1;

        const planeIndex = row * cols + col;
        trianglesIndices[planeIndex * 6 + 0] = topLeftIndex;
        trianglesIndices[planeIndex * 6 + 1] = bottomLeftIndex;
        trianglesIndices[planeIndex * 6 + 2] = bottomRightIndex;

        trianglesIndices[planeIndex * 6 + 3] = topLeftIndex;
        trianglesIndices[planeIndex * 6 + 4] = bottomRightIndex;
        trianglesIndices[planeIndex * 6 + 5] = topRightIndex;

        linesIndices[planeIndex * 8 + 0] = topLeftIndex;
        linesIndices[planeIndex * 8 + 1] = topRightIndex;

        linesIndices[planeIndex * 8 + 2] = topRightIndex;
        linesIndices[planeIndex * 8 + 3] = bottomRightIndex;

        linesIndices[planeIndex * 8 + 4] = bottomRightIndex;
        linesIndices[planeIndex * 8 + 5] = bottomLeftIndex;

        linesIndices[planeIndex * 8 + 6] = bottomLeftIndex;
        linesIndices[planeIndex * 8 + 7] = topLeftIndex;
      }
    }

    return { vertices, trianglesIndices, linesIndices };
  };

  const { vertices, trianglesIndices, linesIndices } = createSombrero(10, 10, 0.02);
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesIndicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, trianglesIndices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, linesIndicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, linesIndices, gl.STATIC_DRAW);

  trianglesCount = trianglesIndices.length;
  linesCount = linesIndices.length;
};
loadSombrero();

/**
 * Setups mvp matrix
 */
const modelMatrix = mat4.identity(mat4.create());
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(1, 2, 1),
  vec3.zero(vec3.create()),
  vec3.fromValues(0, 1, 0)
);
const projMatrix = mat4.perspective(
  mat4.create(),
  glMatrix.toRadian(90),
  gl.canvas.width / gl.canvas.height,
  0.001,
  1000
);
const mvpMatrix = mat4.identity(mat4.create());
const loadMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
loadMvpMatrix();

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesIndicesBuffer);
  gl.uniform4fv(uColor, surfaceColor);
  gl.drawElements(gl.TRIANGLES, trianglesCount, gl.UNSIGNED_INT, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, linesIndicesBuffer);
  gl.uniform4fv(uColor, lineColor);
  gl.drawElements(gl.LINES, linesCount, gl.UNSIGNED_INT, 0);
};
render();

getCanvasResizeObserver(() => {
  mat4.perspective(
    projMatrix,
    glMatrix.toRadian(90),
    gl.canvas.width / gl.canvas.height,
    0.001,
    100
  );
  loadMvpMatrix();
  render();
});
