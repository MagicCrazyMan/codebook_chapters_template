import { mat4, vec3 } from "gl-matrix";
import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ShapeKeepingMatrix;
  varying vec2 v_TexCoord;

  void main() {
    gl_Position = u_ShapeKeepingMatrix * a_Position;
    v_TexCoord = a_TexCoord;
  }
`;
const fragmentShader = `
  #ifdef GL_ES
    precision mediump float;
  #endif

  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  varying vec2 v_TexCoord;

  void main() {
    vec4 texColor0 = texture2D(u_Sampler0, v_TexCoord);
    vec4 texColor1 = texture2D(u_Sampler1, v_TexCoord);
    gl_FragColor = texColor0 * texColor1;
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);
const [aPosition, aTexCoord] = bindWebGLBuffer(gl, program, ["a_Position", "a_TexCoord"]);

// Shape keeping
const uShapeKeepingMatrix = gl.getUniformLocation(program, "u_ShapeKeepingMatrix");
const shapeKeepingMatrix = mat4.fromScaling(
  mat4.create(),
  vec3.fromValues(0, gl.canvas.width / gl.canvas.height, 0)
);
gl.uniformMatrix4fv(uShapeKeepingMatrix, false, shapeKeepingMatrix);
getCanvasResizeObserver(() => {
  gl.uniformMatrix4fv(
    uShapeKeepingMatrix,
    false,
    mat4.fromScaling(shapeKeepingMatrix, vec3.fromValues(1, gl.canvas.width / gl.canvas.height, 1))
  );
  render();
});

// prettier-ignore
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  // vertex coordinates
  -0.666667,  0.5,
  -0.666667, -0.5,
   0.666667, -0.5,
   0.666667,  0.5,
   // texture coordinates
   0, 1,
   0, 0,
   1, 0,
   1, 1
]), gl.STATIC_DRAW)
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 8);

/**@type {HTMLImageElement[]} */
const [image0, image1] = await Promise.all(
  [
    "https://webglfundamentals.org/webgl/resources/leaves.jpg",
    "https://webglfundamentals.org/webgl/resources/star.jpg",
  ].map((url) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = reject;
    });
  })
);

/**
 * Setups texture unit at index 0
 */
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image0);
gl.uniform1i(gl.getUniformLocation(program, "u_Sampler0"), 0);

/**
 * Setups texture unit at index 1
 */
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.activeTexture(gl.TEXTURE1);
gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image1);
gl.uniform1i(gl.getUniformLocation(program, "u_Sampler1"), 1);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
};
render();
