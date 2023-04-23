import {
  compileShader,
  createProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const gl = getWebGLContext();

/**
 * Creates and prepares buffer
 */
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(
  gl.ARRAY_BUFFER,
  new Float32Array([
    // left, coordinates only
    -0.5, -0.5, 0, 0.5, -0.5, 0.5,
    // right, coordinates and colors
    0.5, -0.5, 1, 0, 0, 0.5, 0.5, 0, 1, 0, 0, 0.5, 0, 0, 1,
  ]),
  gl.STATIC_DRAW
);

const initLeft = () => {
  const vertexShader = `
  attribute vec4 a_Position;
  void main() {
    gl_Position = a_Position;
  }
`;
  const fragmentShader = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }
`;
  const program = createProgram(gl, [
    compileShader(gl, gl.VERTEX_SHADER, vertexShader),
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader),
  ]);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  const uFragColor = gl.getUniformLocation(program, "u_FragColor");

  return { program, aPosition, uFragColor };
};

const initRight = () => {
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
  precision mediump float;
  varying vec4 v_Color;
  void main() {
    gl_FragColor = v_Color;
  }
`;
  const program = createProgram(gl, [
    compileShader(gl, gl.VERTEX_SHADER, vertexShader),
    compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader),
  ]);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  const aColor = gl.getAttribLocation(program, "a_Color");

  return { program, aPosition, aColor };
};

const { program: programLeft, aPosition: aPositionLeft, uFragColor: uFragColorLeft } = initLeft();
const leftRender = () => {
  gl.useProgram(programLeft);
  gl.vertexAttribPointer(aPositionLeft, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLeft);
  gl.uniform4f(uFragColorLeft, 1, 0, 0, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

const { program: programRight, aPosition: aPositionRight, aColor: aColorRight } = initRight();
const rightRender = () => {
  gl.useProgram(programRight);
  gl.vertexAttribPointer(
    aPositionRight,
    2,
    gl.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT * 5,
    Float32Array.BYTES_PER_ELEMENT * 6
  );
  gl.vertexAttribPointer(
    aColorRight,
    3,
    gl.FLOAT,
    false,
    Float32Array.BYTES_PER_ELEMENT * 5,
    Float32Array.BYTES_PER_ELEMENT * (6 + 2)
  );
  gl.enableVertexAttribArray(aPositionLeft);
  gl.enableVertexAttribArray(aColorRight);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
};

const render = () => {
  leftRender();
  rightRender();
};

getCanvasResizeObserver(render);
render();
