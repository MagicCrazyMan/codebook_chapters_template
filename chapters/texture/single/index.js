import {
  bindWebGLBuffer,
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  varying vec2 v_TexCoord;

  void main() {
    gl_Position = a_Position;
    v_TexCoord = a_TexCoord;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform sampler2D u_Sampler;
  varying vec2 v_TexCoord;

  void main() {
    gl_FragColor = texture2D(u_Sampler, v_TexCoord);
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);
const [aPosition, aTexCoord] = bindWebGLBuffer(gl, program, ["a_Position", "a_TexCoord"]);

/**
 * Setups vertices and texture coordinates
 */
// prettier-ignore
const verticesTexCoords = new Float32Array([
  // vertex coordinates
  -0.5,  0.5,
  -0.5, -0.5,
   0.5, -0.5,
   0.5,  0.5,
  // texture coordinates
  -0.3,  1.7,
  -0.3, -0.2,
  1.7, -0.2,
  1.7,  1.7,
])
gl.bufferData(gl.ARRAY_BUFFER, verticesTexCoords, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, Float32Array.BYTES_PER_ELEMENT * 8);

/**
 * Setups image
 */
/**@type {HTMLImageElement} */
const image = await new Promise((resolve, reject) => {
  const image = new Image();
  image.crossOrigin = "anonymous"; // WebGL must ask for cross-origin permission to load cross-origin image
  image.src =
    "https://fastly.picsum.photos/id/659/200/300.jpg?hmac=cmMJe403Rt0WMoriAFlgDaHI4FkwevCOXFyhnelzolY";
  image.onload = () => resolve(image);
  image.onerror = reject;
});
const texture = gl.createTexture();
const uSampler = gl.getUniformLocation(program, "u_Sampler");
// Sets image storage mode, flip Y coordinate for normal image
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
// Actives texture unit at index 0
gl.activeTexture(gl.TEXTURE0);
// Binds texture
gl.bindTexture(gl.TEXTURE_2D, texture);
// Setups texture rendering parameters
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); // use linear sampling when scaling down
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); // use clamp to edge when horizontal padding
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT); // use mirror repeat when vertical padding
// Transfers image to texture unit
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
// Tells sampler to use texture unit at index 0
gl.uniform1i(uSampler, 0);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
};
getCanvasResizeObserver(render);
render();
