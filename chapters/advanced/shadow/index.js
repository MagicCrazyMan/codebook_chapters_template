/* eslint-disable @typescript-eslint/no-empty-function */
import { glMatrix, mat4, quat, vec3 } from "gl-matrix";
import {
  compileShader,
  createProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

class WebGLProgrammer {
  /**@type {string} */
  vertexShader;
  /**@type {string} */
  fragmentShader;
  /**@type {string[]} */
  attributeNames = [];
  /**@type {string[]} */
  uniformNames = [];

  /**@type {Record<string, number>} */
  attributeLocations = {};
  /**@type {Record<string, number>} */
  uniformLocations = {};

  /**@type {WebGLProgram | undefined} */
  program;

  /**
   *
   * @param {WebGLRenderingContext} gl
   */
  compile(gl) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, this.vertexShader);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, this.fragmentShader);
    this.program = createProgram(gl, [vertexShader, fragmentShader]);

    this.attributeNames.forEach((attribute) => {
      this.attributeLocations[attribute] = gl.getAttribLocation(this.program, attribute);
    });
    this.uniformNames.forEach((uniform) => {
      this.uniformLocations[uniform] = gl.getUniformLocation(this.program, uniform);
    });
  }

  /**
   *
   * @param {WebGLRenderingContext} gl
   * @returns {WebGLProgram}
   */
  getProgram(gl) {
    if (!this.program) this.compile(gl);
    return this.program;
  }
}

/**
 * @abstract
 */
class Geometry {
  /**
   * @type {vec3}
   * @private
   */
  position = vec3.create();
  /**
   * @type {vec3}
   * @private
   */
  rotation = vec3.create();
  /**
   * @type {vec3}
   * @private
   */
  scale = vec3.fromValues(1, 1, 1);

  /**
   * @type {mat4}
   * @private
   */
  modelMatrix = mat4.create();

  /**
   * @private
   * @type {WebGLBuffer | undefined}
   */
  verticesBuffer;

  /**
   * @private
   * @type {WebGLBuffer | undefined}
   */
  colorsBuffer;

  /**
   * @param {vec3} [position]
   * @param {vec3} [rotation]
   * @param {vec3} [scale]
   */
  constructor(position, rotation, scale) {
    if (position) this.setPosition(position);
    if (rotation) this.setRotation(rotation);
    if (scale) this.setScale(scale);
    this.updateModelMatrix();
  }

  /**
   * @param {vec3} position
   */
  setPosition(position) {
    this.position = position;
  }

  /**
   * @param {vec3} rotation
   */
  setRotation(rotation) {
    this.rotation = rotation;
  }

  /**
   * @param {vec3} scale
   */
  setScale(scale) {
    this.scale = scale;
  }

  updateModelMatrix() {
    mat4.fromRotationTranslationScale(
      this.modelMatrix,
      quat.fromEuler(quat.create(), this.rotation[0], this.rotation[1], this.rotation[2]),
      this.position,
      this.scale
    );
  }

  /**
   * @returns {mat4}
   */
  getModelMatrix() {
    return this.modelMatrix;
  }

  /**
   * @abstract
   * @returns {Float32Array}
   */
  getVerticesArray() {}

  /**
   * @abstract
   * @param {WebGLRenderingContext} gl
   * @returns {WebGLBuffer}
   */
  getVerticesBuffer(gl) {
    if (!this.verticesBuffer) {
      this.verticesBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.getVerticesArray(), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this.verticesBuffer;
  }

  /**
   * @abstract
   * @returns {number}
   */
  getVertexCount() {}

  /**
   * @abstract
   * @returns {Float32Array}
   */
  getColorsArray() {}

  /**
   * @abstract
   * @param {WebGLRenderingContext} gl
   * @returns {WebGLBuffer}
   */
  getColorsBuffer(gl) {
    if (!this.colorsBuffer) {
      this.colorsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.getColorsArray(), gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this.colorsBuffer;
  }

  /**
   * @abstract
   * @param {WebGLRenderingContext} gl
   * @returns {GLenum}
   */
  getType(gl) {}
}

class PerspectiveCamera {
  /**@private */
  position = vec3.create();
  /**@private */
  lookAt = vec3.create();
  /**@private */
  fovy = 0;
  /**@private */
  aspect = 0;
  /**@private */
  near = 0;
  /**@private */
  far = 0;

  /**@private */
  viewMatrix = mat4.create();
  /**@private */
  projMatrix = mat4.create();
  /**@private */
  viewProjMatrix = mat4.create();

  /**
   * Constructs a perspective camera
   * @param {vec3} position
   * @param {vec3} lookAt
   * @param {number} fovy
   * @param {number} aspect
   * @param {number} near
   * @param {number} far
   */
  constructor(position, lookAt, fovy, aspect, near, far) {
    this.setView(position, lookAt);
    this.setPerspective(fovy, aspect, near, far);
    this.updateViewProjectMatrix();
  }

  /**
   *
   * @param {vec3} position
   * @param {vec3} lookAt
   */
  setView(position, lookAt) {
    this.position.set(position);
    this.lookAt.set(lookAt);
  }

  /**
   *
   * @param {number} fovy
   * @param {number} aspect
   * @param {number} near
   * @param {number} far
   */
  setPerspective(fovy, aspect, near, far) {
    this.fovy = fovy;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  updateViewMatrix() {
    mat4.lookAt(this.viewMatrix, this.position, this.lookAt, vec3.fromValues(0, 1, 0));
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projMatrix, this.fovy, this.aspect, this.near, this.far);
  }

  updateViewProjectMatrix() {
    this.updateViewMatrix();
    this.updateProjectionMatrix();
    mat4.identity(this.viewProjMatrix);
    mat4.multiply(this.viewProjMatrix, this.viewProjMatrix, this.projMatrix);
    mat4.multiply(this.viewProjMatrix, this.viewProjMatrix, this.viewMatrix);
  }

  getViewProjMatrix() {
    return this.viewProjMatrix;
  }
}

class ShadowMapRender extends WebGLProgrammer {
  vertexShader = `
    attribute vec4 a_Position;
    uniform mat4 u_MvpMatrix;

    void main() {
      gl_Position = u_MvpMatrix * a_Position;
    }
  `;
  fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    void main() {
      const vec4 bitShift = vec4(1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0);
      const vec4 bitMask = vec4(1.0/256.0, 1.0/256.0, 1.0/256.0, 0.0);
      vec4 rgbaDepth = fract(gl_FragCoord.z * bitShift);
      rgbaDepth -= rgbaDepth.gbaa * bitMask;
      gl_FragColor = rgbaDepth;
    }
  `;
  attributeNames = ["a_Position"];
  uniformNames = ["u_MvpMatrix"];

  /**
   * @private
   * @type {WebGLFramebuffer | undefined}
   */
  framebuffer;
  /**
   * @private
   * @type {WebGLTexture | undefined}
   */
  shadowMap;
  /**
   * @private
   * @type {WebGLRenderbuffer | undefined}
   */
  renderbuffer;

  /**
   * @type {PerspectiveCamera | undefined}
   * @readonly
   */
  lightCamera;
  /**
   * @type {number | undefined}
   * @readonly
   */
  bufferWidth;
  /**
   * @type {number | undefined}
   * @readonly
   */
  bufferHeight;

  /**
   *
   * @param {PerspectiveCamera} lightCamera
   * @param {number} [bufferWidth]
   * @param {number} [bufferHeight]
   */
  constructor(lightCamera, bufferWidth, bufferHeight) {
    super();
    this.lightCamera = lightCamera;
    this.bufferWidth = bufferWidth;
    this.bufferHeight = bufferHeight;
  }

  /**
   *
   * @param {WebGLRenderingContext} gl
   */
  prepare(gl) {
    if (!this.shadowMap) {
      this.shadowMap = gl.createTexture();

      gl.bindTexture(gl.TEXTURE_2D, this.shadowMap);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        this.bufferWidth ?? gl.canvas.width,
        this.bufferHeight ?? gl.canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
    if (!this.renderbuffer) {
      this.renderbuffer = gl.createRenderbuffer();

      gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
      gl.renderbufferStorage(
        gl.RENDERBUFFER,
        gl.DEPTH_COMPONENT16,
        this.bufferWidth ?? gl.canvas.width,
        this.bufferHeight ?? gl.canvas.height
      );
    }
    if (!this.framebuffer) {
      this.framebuffer = gl.createFramebuffer();

      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        this.shadowMap,
        0
      );
      gl.framebufferRenderbuffer(
        gl.FRAMEBUFFER,
        gl.DEPTH_ATTACHMENT,
        gl.RENDERBUFFER,
        this.renderbuffer
      );
    }
  }

  /**
   *
   * @param {WebGLRenderingContext} gl
   * @param {PerspectiveCamera} camera
   * @param {Geometry[]} geometries
   */
  render(gl, geometries) {
    this.prepare(gl);

    // bind framebuffer
    gl.useProgram(this.getProgram(gl));
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);

    gl.viewport(0, 0, this.bufferWidth, this.bufferHeight);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const mvpMatrixTemp = mat4.create();
    geometries.forEach((geometry) => {
      mat4.identity(mvpMatrixTemp);
      mat4.multiply(mvpMatrixTemp, this.lightCamera.getViewProjMatrix(), geometry.getModelMatrix());
      gl.uniformMatrix4fv(this.uniformLocations["u_MvpMatrix"], false, mvpMatrixTemp);

      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getVerticesBuffer(gl));
      gl.vertexAttribPointer(this.attributeLocations["a_Position"], 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attributeLocations["a_Position"]);

      gl.drawArrays(geometry.getType(gl), 0, geometry.getVertexCount());
    });

    // unbind framebuffer after finishing rendering
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  getShadowMap() {
    return this.shadowMap;
  }

  getLightCamera() {
    return this.lightCamera;
  }
}

class ShadowRender extends WebGLProgrammer {
  vertexShader = `
    attribute vec4 a_Position;
    attribute vec4 a_Color;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_MvpMatrixFromLight;

    varying vec4 v_PositionFromLight;
    varying vec4 v_Color;

    void main() {
      gl_Position = u_MvpMatrix * a_Position;
      v_PositionFromLight = u_MvpMatrixFromLight * a_Position;
      v_Color = a_Color;
    }
  `;
  fragmentShader = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform sampler2D u_ShadowMap;
    varying vec4 v_PositionFromLight;
    varying vec4 v_Color;

    float unpackDepth(const in vec4 rgbaDepth) {
      const vec4 bitShift = vec4(1.0, 1.0/256.0, 1.0/(256.0*256.0), 1.0/(256.0*256.0*256.0));
      float depth = dot(rgbaDepth, bitShift);
      return depth;
    }
  
    void main() {
      vec3 shadowCoord = (v_PositionFromLight.xyz / v_PositionFromLight.w) / 2.0 + 0.5;
      vec4 rgbaDepth = texture2D(u_ShadowMap, shadowCoord.xy);
      float depth = unpackDepth(rgbaDepth);
      float visibility = (shadowCoord.z > depth + 0.0015) ? 0.7 : 1.0;
      gl_FragColor = vec4(v_Color.rgb * visibility, v_Color.a);
    }
  `;
  attributeNames = ["a_Position", "a_Color"];
  uniformNames = ["u_MvpMatrix", "u_MvpMatrixFromLight", "u_ShadowMap"];

  /**
   *
   * @param {WebGLRenderingContext} gl
   * @param {PerspectiveCamera} camera
   * @param {Geometry[]} geometries
   * @param {WebGLTexture} shadowMap
   * @param {PerspectiveCamera} lightCamera
   */
  render(gl, camera, geometries, shadowMap, lightCamera) {
    gl.useProgram(this.getProgram(gl));

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, shadowMap);
    gl.uniform1i(this.uniformLocations["u_ShadowMap"], 0);

    const mvpMatrixTemp = mat4.create();
    const mvpMatrixFromLightTemp = mat4.create();
    geometries.forEach((geometry) => {
      mat4.identity(mvpMatrixTemp);
      mat4.multiply(mvpMatrixTemp, mvpMatrixTemp, camera.getViewProjMatrix());
      mat4.multiply(mvpMatrixTemp, mvpMatrixTemp, geometry.getModelMatrix());
      gl.uniformMatrix4fv(this.uniformLocations["u_MvpMatrix"], false, mvpMatrixTemp);

      mat4.identity(mvpMatrixFromLightTemp);
      mat4.multiply(
        mvpMatrixFromLightTemp,
        mvpMatrixFromLightTemp,
        lightCamera.getViewProjMatrix()
      );
      mat4.multiply(mvpMatrixFromLightTemp, mvpMatrixFromLightTemp, geometry.getModelMatrix());
      gl.uniformMatrix4fv(
        this.uniformLocations["u_MvpMatrixFromLight"],
        false,
        mvpMatrixFromLightTemp
      );

      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getVerticesBuffer(gl));
      gl.vertexAttribPointer(this.attributeLocations["a_Position"], 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attributeLocations["a_Position"]);

      gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getColorsBuffer(gl));
      gl.vertexAttribPointer(this.attributeLocations["a_Color"], 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.attributeLocations["a_Color"]);

      gl.drawArrays(geometry.getType(gl), 0, geometry.getVertexCount());
    });

    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

class Plane extends Geometry {
  /**
   *  v1------v0
   *  |        |
   *  |        |
   *  |        |
   *  v2------v3
   * @type {Float32Array}
   * @private
   */
  // prettier-ignore
  vertex = new Float32Array([
     3.0, -1.7,  2.5,
    -3.0, -1.7,  2.5,
    -3.0, -1.7, -2.5,
     3.0, -1.7, -2.5
  ]);

  // prettier-ignore
  colors = new Float32Array([
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0,
    1.0, 1.0, 1.0
 ]);

  /**
   *
   * @param {vec3} [position]
   * @param {vec3} [rotation]
   * @param {vec3} [scale]
   */
  constructor(position, rotation, scale) {
    super(position, rotation, scale);
  }

  /**
   *
   * @param {WebGLRenderingContext} gl
   */
  getType(gl) {
    return gl.TRIANGLE_FAN;
  }

  getVerticesArray() {
    return this.vertex;
  }

  getVertexCount() {
    return 4;
  }

  getColorsArray() {
    return this.colors;
  }
}

class Triangle extends Geometry {
  /**
   *       v2
   *      / |
   *     /  |
   *    /   |
   *  v0----v1
   * @type {Float32Array}
   * @private
   */
  // prettier-ignore
  vertex = new Float32Array([
    -0.8, 3.5, 0.0,
     0.8, 3.5, 0.0,
     0.0, 3.5, 1.8
 ]);

  // prettier-ignore
  colors = new Float32Array([
    1.0, 0.5, 0.0,
    1.0, 0.5, 0.0,
    1.0, 0.0, 0.0
 ]);

  /**
   *
   * @param {vec3} [position]
   * @param {vec3} [rotation]
   * @param {vec3} [scale]
   */
  constructor(position, rotation, scale) {
    super(position, rotation, scale);
  }

  /**
   *
   * @param {WebGLRenderingContext} gl
   * @returns
   */
  getType(gl) {
    return gl.TRIANGLES;
  }

  getVerticesArray() {
    return this.vertex;
  }

  getVertexCount() {
    return 3;
  }

  getColorsArray() {
    return this.colors;
  }
}

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);

const OFFSCREEN_WIDTH = 2048;
const OFFSCREEN_HEIGHT = 2048;
const shadowMapRender = new ShadowMapRender(
  new PerspectiveCamera(
    vec3.fromValues(0.0, 40.0, 2.0),
    vec3.fromValues(0.0, 0.0, 0.0),
    glMatrix.toRadian(70),
    OFFSCREEN_WIDTH / OFFSCREEN_HEIGHT,
    1,
    100
  ),
  OFFSCREEN_WIDTH,
  OFFSCREEN_HEIGHT
);
const shadowRender = new ShadowRender();
const camera = new PerspectiveCamera(
  vec3.fromValues(0.0, 7.0, 9.0),
  vec3.fromValues(0.0, 0.0, 0.0),
  glMatrix.toRadian(45),
  gl.canvas.width / gl.canvas.height,
  1,
  100
);
const plane = new Plane();
plane.setRotation(vec3.fromValues(0, -45, -45));
plane.updateModelMatrix();
const triangle = new Triangle();
const dps = 30; // rotation degrees per second
let lastRenderTime = 0;
const geometries = [plane, triangle];

const render = (renderTime) => {
  // update triangle rotation
  const rotation = ((renderTime / 1000) * dps) % 360;
  triangle.setRotation(vec3.fromValues(0, rotation, 0));
  triangle.updateModelMatrix();

  // render shadow map first
  shadowMapRender.render(gl, geometries);
  const shadowMap = shadowMapRender.getShadowMap();
  const lightCamera = shadowMapRender.getLightCamera();
  // render shadow
  shadowRender.render(gl, camera, geometries, shadowMap, lightCamera);

  lastRenderTime = renderTime;

  requestAnimationFrame(render);
};
render(0);

getCanvasResizeObserver(() => {
  camera.setPerspective(glMatrix.toRadian(45), gl.canvas.width / gl.canvas.height, 1, 100);
  camera.updateViewProjectMatrix();
  render(lastRenderTime);
});
