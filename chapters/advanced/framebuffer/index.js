import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;

  uniform mat4 u_MvpMatrix;

  varying vec2 v_TexCoord;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
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
gl.enable(gl.DEPTH_TEST);
const program = bindWebGLProgram(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aTexCoord = gl.getAttribLocation(program, "a_TexCoord");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uSampler = gl.getUniformLocation(program, "u_Sampler");

const ROTATION_PER_SECOND = glMatrix.toRadian(5);
let lastRenderTime = 0;
let compileFailure = false;

/**
 * Setups vertices and texture coords
 *   v6----- v5
 *  /|      /|
 * v1------v0|
 * | |     | |
 * | |v7---|-|v4
 * |/      |/
 * v2------v3
 */
/**@type {HTMLImageElement} */
const cubeImage = await fetch("/resources/sky.jpg")
  .then((res) => res.blob())
  .then((blob) => URL.createObjectURL(blob))
  .then(
    (url) =>
      new Promise((resolve) => {
        const image = new Image();
        image.src = url;
        image.onload = () => {
          resolve(image);
        };
      })
  );
const cubeTexture = gl.createTexture();
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, cubeImage);
gl.uniform1i(uSampler, 0);
gl.bindTexture(gl.TEXTURE_2D, null); // unbinds texture after loaded
// prettier-ignore
const cubeVertices = new Float32Array([
  1.0, 1.0, 1.0,  -1.0, 1.0, 1.0,  -1.0,-1.0, 1.0,   1.0,-1.0, 1.0,  // v0-v1-v2-v3 front
  1.0, 1.0, 1.0,   1.0,-1.0, 1.0,   1.0,-1.0,-1.0,   1.0, 1.0,-1.0,  // v0-v3-v4-v5 right
  1.0, 1.0, 1.0,   1.0, 1.0,-1.0,  -1.0, 1.0,-1.0,  -1.0, 1.0, 1.0,  // v0-v5-v6-v1 up
 -1.0, 1.0, 1.0,  -1.0, 1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0,-1.0, 1.0,  // v1-v6-v7-v2 left
 -1.0,-1.0,-1.0,   1.0,-1.0,-1.0,   1.0,-1.0, 1.0,  -1.0,-1.0, 1.0,  // v7-v4-v3-v2 down
  1.0,-1.0,-1.0,  -1.0,-1.0,-1.0,  -1.0, 1.0,-1.0,   1.0, 1.0,-1.0   // v4-v7-v6-v5 back
]);
const cubeVerticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);
// prettier-ignore
const cubeTexCoords = new Float32Array([
  1, 1,  0, 1,  0, 0,  1, 0, // front 
  1, 1,  0, 1,  0, 0,  1, 0, // right
  1, 1,  0, 1,  0, 0,  1, 0, // up
  1, 1,  0, 1,  0, 0,  1, 0, // left
  1, 1,  0, 1,  0, 0,  1, 0, // down
  1, 1,  0, 1,  0, 0,  1, 0, // back
]);
const cubeTexCoordsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexCoordsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubeTexCoords, gl.STATIC_DRAW);
// prettier-ignore
const cubeIndices = new Uint8Array([
   0,  1,  2,  0,  2,  3,    // front
   4,  5,  6,  4,  6,  7,    // right
   8,  9, 10,  8, 10, 11,    // up
  12, 13, 14, 12, 14, 15,    // left
  16, 17, 18, 16, 18, 19,    // down
  20, 21, 22, 20, 22, 23     // back
]);
const cubeIndicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

/**
 * Setups model view projection matrix
 */
const cubeProjMatrix = mat4.create();
const cubeViewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(5, 3, 5),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
let cubeRotation = 0;
const cubeModelMatrix = mat4.create();
const cubeMvpMatrix = mat4.create();
const setCubeProjMatrix = () => {
  mat4.perspective(
    cubeProjMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
};
const setCubeModelMatrix = (renderTime) => {
  const offset = (renderTime - lastRenderTime) / 1000;
  cubeRotation += (offset * ROTATION_PER_SECOND * 5) % Math.PI;

  mat4.fromRotation(cubeModelMatrix, cubeRotation, vec3.fromValues(0, 1, 0));
};
const setCubeMvpMatrix = () => {
  mat4.identity(cubeMvpMatrix);
  mat4.multiply(cubeMvpMatrix, cubeMvpMatrix, cubeProjMatrix);
  mat4.multiply(cubeMvpMatrix, cubeMvpMatrix, cubeViewMatrix);
  mat4.multiply(cubeMvpMatrix, cubeMvpMatrix, cubeModelMatrix);

  gl.uniformMatrix4fv(uMvpMatrix, false, cubeMvpMatrix);
};

/**
 * Setups frame buffer
 */
// creates frame buffer object
const fbo = gl.createFramebuffer();
// creates texture for framebuffer object
const fboTexture = gl.createTexture();
// assigns texture to webgl
gl.bindTexture(gl.TEXTURE_2D, fboTexture);
// creates an area to storage image for texture
// set `pixels` to `null` to creates an empty area
gl.texImage2D(
  gl.TEXTURE_2D,
  0,
  gl.RGBA,
  gl.canvas.width,
  gl.canvas.height,
  0,
  gl.RGBA,
  gl.UNSIGNED_BYTE,
  null
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
// creates depth buffer for framebuffer object
const fboDepthBuffer = gl.createRenderbuffer();
// assigns depth buffer to webgl
gl.bindRenderbuffer(gl.RENDERBUFFER, fboDepthBuffer);
// creates and initializes depth buffer
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, gl.canvas.width, gl.canvas.height);
// assigns framebuffer object to webgl
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
// binds texture buffer to framebuffer object
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0);
// binds depth buffer to framebuffer object
gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, fboDepthBuffer);
// checks status
if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
  console.error(`Framebuffer object is incomplete: ${gl.checkFramebufferStatus(gl.FRAMEBUFFER)}`);
  compileFailure = true;
}

const renderCube = (renderTime) => {
  setCubeModelMatrix(renderTime);
  setCubeMvpMatrix();

  // assigns framebuffer object
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // binds data
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVerticesBuffer);
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTexCoordsBuffer);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, cubeTexture);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndicesBuffer);

  gl.clearColor(0.2, 0.2, 0.4, 1.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.drawElements(gl.TRIANGLES, cubeIndices.length, gl.UNSIGNED_BYTE, 0);

  // unbinds framebuffer after rendered
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
};

/**
 * Setups plane indices
 */
// prettier-ignore
const planeVertices = new Float32Array([
  0.5, 0.5,  -0.5, 0.5,  -0.5, -0.5,  0.5, -0.5
]);
const planeVerticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, planeVerticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, planeVertices, gl.STATIC_DRAW);
// prettier-ignore
const planeTexCoords = new Float32Array([
  1, 1,  0, 1,  0, 0,  1, 0
]);
const planeTexCoordsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, planeTexCoordsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, planeTexCoords, gl.STATIC_DRAW);
// prettier-ignore
const planeIndices = new Uint8Array([
  0, 1, 2, 0, 2, 3
]);
const planeIndicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIndicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, planeIndices, gl.STATIC_DRAW);

/**
 * Setups plane model matrix
 */
const planeViewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(2, 1, 2),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const planeProjMatrix = mat4.create();
let planeRotation = 0;
const planeModelMatrix = mat4.create();
const planeMvpMatrix = mat4.create();
const setPlaneProjMatrix = () => {
  mat4.perspective(
    planeProjMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
};
const setPlaneModelMatrix = (renderTime) => {
  const offset = (renderTime - lastRenderTime) / 1000;
  planeRotation += (offset * ROTATION_PER_SECOND) % Math.PI;

  mat4.fromRotation(planeModelMatrix, planeRotation, vec3.fromValues(0, 1, 0));
};
const setPlaneMvpMatrix = () => {
  mat4.identity(planeMvpMatrix);
  mat4.multiply(planeMvpMatrix, planeMvpMatrix, planeProjMatrix);
  mat4.multiply(planeMvpMatrix, planeMvpMatrix, planeViewMatrix);
  mat4.multiply(planeMvpMatrix, planeMvpMatrix, planeModelMatrix);

  gl.uniformMatrix4fv(uMvpMatrix, false, planeMvpMatrix);
};

const renderPlane = (renderTime) => {
  setPlaneModelMatrix(renderTime);
  setPlaneMvpMatrix();

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // binds data
  gl.bindBuffer(gl.ARRAY_BUFFER, planeVerticesBuffer);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);
  gl.bindBuffer(gl.ARRAY_BUFFER, planeTexCoordsBuffer);
  gl.vertexAttribPointer(aTexCoord, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aTexCoord);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, fboTexture);

  gl.clearColor(0.0, 0.0, 0.0, 0.0);
  gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, planeIndicesBuffer);
  gl.drawElements(gl.TRIANGLES, planeIndices.length, gl.UNSIGNED_BYTE, 0);
};

if (!compileFailure) {
  const render = (renderTime) => {
    renderCube(renderTime);
    renderPlane(renderTime);

    lastRenderTime = renderTime;

    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  getCanvasResizeObserver(() => {
    setCubeProjMatrix();
    setPlaneProjMatrix();
    render(lastRenderTime);
  });
}
