import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  
  varying vec4 v_Color;

  void main() {
    gl_Position = a_Position;
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif
  
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
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");

/**
 * Setups data
 */
const countInput = document.getElementById("count");
countInput.addEventListener("input", () => {
  loadSierpinski();
  render();
});
let data = null;
const buffer = gl.createBuffer();
const loadSierpinski = () => {
  /**
   * Creates Sierpinski vertices and colors
   * @param {number} count
   * @returns Sierpinski vertices and colors
   */
  const createSierpinski = (count) => {
    const red = [1.0, 0.0, 0.0];
    const green = [0.0, 1.0, 0.0];
    const blue = [0.0, 0.0, 1.0];
    const white = [1.0, 1.0, 1.0];

    const topVertex = [0.0, 1.0, 1.0];
    const leftVertex = [-1.0, -1.0, 1.0];
    const rightVertex = [1.0, -1.0, 1.0];
    const centerVertex = [
      (topVertex[0] + leftVertex[0] + rightVertex[0]) / 3,
      (topVertex[1] + leftVertex[1] + rightVertex[1]) / 3,
      -1.0,
    ];
    let triangles = [
      [topVertex, white, rightVertex, white, leftVertex, white],
      [topVertex, red, centerVertex, red, leftVertex, red],
      [topVertex, blue, rightVertex, blue, centerVertex, blue],
      [centerVertex, green, rightVertex, green, leftVertex, green],
    ];

    for (let i = 0; i < count; i++) {
      const dividedTriangles = [];
      let triangle = triangles.pop();
      while (triangle) {
        const leftMiddleVertex = [
          (triangle[0][0] + triangle[4][0]) / 2,
          (triangle[0][1] + triangle[4][1]) / 2,
          (triangle[0][2] + triangle[4][2]) / 2,
        ];
        const rightMiddleVertex = [
          (triangle[0][0] + triangle[2][0]) / 2,
          (triangle[0][1] + triangle[2][1]) / 2,
          (triangle[0][2] + triangle[2][2]) / 2,
        ];
        const bottomMiddleVertex = [
          (triangle[4][0] + triangle[2][0]) / 2,
          (triangle[4][1] + triangle[2][1]) / 2,
          (triangle[4][2] + triangle[2][2]) / 2,
        ];
        const color = triangle[1];

        const topTriangle = [triangle[0], color, rightMiddleVertex, color, leftMiddleVertex, color];
        const rightTriangle = [
          rightMiddleVertex,
          color,
          triangle[2],
          color,
          bottomMiddleVertex,
          color,
        ];
        const leftTriangle = [
          leftMiddleVertex,
          color,
          bottomMiddleVertex,
          color,
          triangle[4],
          color,
        ];
        dividedTriangles.push(topTriangle);
        dividedTriangles.push(rightTriangle);
        dividedTriangles.push(leftTriangle);

        triangle = triangles.pop();
      }

      triangles = dividedTriangles;
    }

    console.log(triangles);

    return new Float32Array(triangles.flat(2));
  };

  data = createSierpinski(parseInt(countInput.value));
  console.log(data);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, Float32Array.BYTES_PER_ELEMENT * 6, 0);
  gl.vertexAttribPointer(
    aColor,
    3,
    gl.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT * 6,
    Float32Array.BYTES_PER_ELEMENT * 3
  );
  gl.enableVertexAttribArray(aPosition);
  gl.enableVertexAttribArray(aColor);
};
loadSierpinski();

gl.enable(gl.DEPTH_TEST);
const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, data.length / 6);
};

getCanvasResizeObserver(render);
render();
