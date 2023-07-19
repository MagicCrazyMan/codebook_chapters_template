import { glMatrix, mat4, vec3 } from "gl-matrix";
import {
  bindWebGLProgram,
  getCanvas,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common.js";

const start = () => {
  const vertexShader = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    attribute vec4 a_Normal;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_NormalMatrix;
  
    varying vec4 v_Color;
    varying vec3 v_Normal;
    varying vec3 v_Position;
  
    void main() {
      gl_Position = u_MvpMatrix * a_Position;
      // calculates vertex position in world coordinates system
      v_Position = vec3(u_ModelMatrix * a_Position);
      v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
      v_Color = a_Color;
    }
  `;
  const fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif
  
    uniform vec3 u_LightColor;
    uniform vec3 u_LightPosition;
    uniform vec3 u_AmbientLight;
  
    varying vec4 v_Color;
    varying vec3 v_Normal;
    varying vec3 v_Position;
  
    void main() {
      // normalizes normal vector because it is interpolated and not 1.0 in length any more
      vec3 normal = normalize(v_Normal);
      // calculates light direction and normalizes it
      vec3 lightDirection = normalize(u_LightPosition - v_Position);
      // calculates incidence
      float incidence = max(dot(normal, lightDirection), 0.0);
      // calculates diffuse light color
      vec3 diffuse = u_LightColor * v_Color.rgb * incidence;
      // calculates ambient light color
      vec3 ambient = u_AmbientLight * v_Color.rgb;
      gl_FragColor = vec4(diffuse + ambient, v_Color.a);
    }
  `;

  const gl = getWebGLContext();
  const program = bindWebGLProgram(gl, [
    { source: vertexShader, type: gl.VERTEX_SHADER },
    { source: fragmentShader, type: gl.FRAGMENT_SHADER },
  ]);

  /**
   * Setups mvp and normal matrix
   */
  const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
  const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
  const uNormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
  const rps = glMatrix.toRadian(20); // Radian Per Second
  let lastAnimationTime = 0;
  let currentRotation = 0;
  const modelMatrix = mat4.create();
  const viewMatrix = mat4.lookAt(
    mat4.create(),
    vec3.fromValues(6, 6, 14),
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(0, 1, 0)
  );
  const projectionMatrix = mat4.create();
  const mvpMatrix = mat4.create();
  const normalMatrix = mat4.create();
  const setProjectionMatrix = () => {
    mat4.perspective(
      projectionMatrix,
      glMatrix.toRadian(30),
      gl.canvas.width / gl.canvas.height,
      1,
      100
    );
  };
  const setModelMatrix = (time) => {
    currentRotation += ((time - lastAnimationTime) / 1000) * rps;
    currentRotation %= 2 * Math.PI;
    mat4.fromYRotation(modelMatrix, currentRotation);
    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
  };
  const setMvpMatrix = () => {
    mat4.identity(mvpMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, projectionMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
    mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
    gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
  };
  const setNormalMatrix = () => {
    mat4.invert(normalMatrix, modelMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
  };

  /**
   * Setups cube normals
   */
  // prettier-ignore
  const normals = new Float32Array([
    0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
    1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
    0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
   -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
    0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
    0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
  ]);
  const normalsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
  const uNormals = gl.getAttribLocation(program, "a_Normal");
  gl.vertexAttribPointer(uNormals, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(uNormals);

  /**
   * Setups diffuse light color
   */
  const uLightColor = gl.getUniformLocation(program, "u_LightColor");
  const setDiffuseLightColor = () => {
    gl.uniform3f(uLightColor, 1, 1, 1);
  };
  setDiffuseLightColor();

  /**
   * Setups diffuse light position
   */
  const uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
  gl.uniform3f(uLightPosition, 2.3, 4.0, 3.5);

  /**
   * Setups ambient light
   */
  const uAmbientLight = gl.getUniformLocation(program, "u_AmbientLight");
  const setAmbientLightColor = () => {
    gl.uniform3f(uAmbientLight, 0.2, 0.2, 0.2);
  };
  setAmbientLightColor();

  /**
   * Setups cube
   *   v6----- v5
   *  /|      /|
   * v1------v0|
   * | |     | |
   * | |v7---|-|v4
   * |/      |/
   * v2------v3
   */
  // prettier-ignore
  const vertices = new Float32Array([
    2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0,  // v0-v1-v2-v3 front
    2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0,  // v0-v3-v4-v5 right
    2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0,  // v0-v5-v6-v1 up
   -2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0,  // v1-v6-v7-v2 left
   -2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0,  // v7-v4-v3-v2 down
    2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0   // v4-v7-v6-v5 back
  ]);
  const verticesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const aPosition = gl.getAttribLocation(program, "a_Position");
  gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPosition);

  // prettier-ignore
  const colors = new Float32Array([
    0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front(blue)
    0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right(green)
    1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up(red)
    1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left(yellow)
    1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 bottom(white)
    0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back(cyan)
  ]);
  const colorsBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
  const aColor = gl.getAttribLocation(program, "a_Color");
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColor);

  // prettier-ignore
  const indices = new Uint8Array([
    0,  1,  2,  0,  2,  3,    // front
    4,  5,  6,  4,  6,  7,    // right
    8,  9, 10,  8, 10, 11,    // up
   12, 13, 14, 12, 14, 15,    // left
   16, 17, 18, 16, 18, 19,    // down
   20, 21, 22, 20, 22, 23     // back
  ]);
  const indicesBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.enable(gl.DEPTH_TEST);
  let stop = false;
  const render = (time) => {
    if (stop) return;

    setModelMatrix(time);
    setNormalMatrix();
    setMvpMatrix();

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

    requestAnimationFrame(render);
    lastAnimationTime = time;
  };
  render(0);

  getCanvasResizeObserver(() => {
    setProjectionMatrix();
    render(lastAnimationTime);
  });

  const stopRender = () => {
    stop = true;
  };
  return { gl, stopRender };
};

let { gl, stopRender } = start();
/**
 * Response to webgl context lost and restore
 */
let contextLost = false;
const canvas = getCanvas();
canvas.addEventListener("webglcontextlost", (e) => {
  console.warn("webgl context lost");
  contextLost = true;
  stopRender();
  // preventDefault must be called
  e.preventDefault();
});
canvas.addEventListener("webglcontextrestored", () => {
  console.warn("webgl context restored");
  contextLost = false;
  const scene = start();
  gl = scene.gl;
  stopRender = scene.stopRender;
});

const simulator = gl.getExtension("WEBGL_lose_context");
const button = document.getElementById("context");
button.addEventListener("click", () => {
  if (contextLost) {
    simulator.restoreContext();
    button.innerText = "click to simulate context lost";
  } else {
    simulator.loseContext();
    button.innerText = "click to simulate context restored";
  }
});
