import {
  compileShader,
  createProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const gl = getWebGLContext();

/**
 * Vertex shader code
 */
const vertexShaderCode = `
  void main() {
    gl_Position = vec4(0.5, 0.5, 0.0, 1.0);
    gl_PointSize = 10.0;
  }
`;
/**
 * Fragment shader code
 */
const fragmentShaderCode = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

// Compile shaders
const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexShaderCode);
const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderCode);

// Create WebGL program
const program = createProgram(gl, [vertexShader, fragmentShader]);
gl.useProgram(program);

// Sets clearing color of color buffer to transparent
gl.clearColor(0.0, 0.0, 0.0, 0.0);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Draw a single point
  gl.drawArrays(gl.POINTS, 0, 1);
};

getCanvasResizeObserver(render);
render();
