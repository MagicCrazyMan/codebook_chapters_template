import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;

  void main() {
    gl_Position = a_Position;
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
    let triangles = [
      [
        [0.0, 1.0, 0.0],
        [1.0, -1.0, 0.0],
        [-1.0, -1.0, 0.0],
      ],
    ];
    for (let i = 0; i < count; i++) {
      const dividedTriangles = [];
      let triangle = triangles.pop();
      while (triangle) {
        const leftMiddle = [
          (triangle[0][0] + triangle[2][0]) / 2,
          (triangle[0][1] + triangle[2][1]) / 2,
          0,
        ];
        const rightMiddle = [
          (triangle[0][0] + triangle[1][0]) / 2,
          (triangle[0][1] + triangle[1][1]) / 2,
          0,
        ];
        const bottomMiddle = [
          (triangle[1][0] + triangle[2][0]) / 2,
          (triangle[1][1] + triangle[2][1]) / 2,
          0,
        ];

        const topTriangle = [triangle[0], rightMiddle, leftMiddle];
        const rightTriangle = [rightMiddle, triangle[1], bottomMiddle];
        const leftTriangle = [leftMiddle, bottomMiddle, triangle[2]];
        dividedTriangles.push(topTriangle);
        dividedTriangles.push(rightTriangle);
        dividedTriangles.push(leftTriangle);

        triangle = triangles.pop();
      }

      triangles = dividedTriangles;
    }

    return new Float32Array(triangles.flat(2));
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
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
};

getCanvasResizeObserver(render);
render();
