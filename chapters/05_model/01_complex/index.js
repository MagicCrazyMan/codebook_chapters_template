import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

class ModelRender {
  /**
   * Vertex shader source code
   * @private
   */
  vertexShaderSource = `
      attribute vec4 a_Position;
      attribute vec3 a_Color;
      attribute vec4 a_Normal;
    
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;
      uniform mat4 u_NormalMatrix;

      varying vec3 v_Position;
      varying vec3 v_Color;
      varying vec3 v_Normal;
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = vec3(u_NormalMatrix * a_Normal);
        v_Color = a_Color;
      }
  `;

  /**
   * Fragment shader source code
   * @private
   */
  fragmentShaderSource = `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
    precision mediump float;
  #endif
    
      vec3 lightPosition = vec3(10.0, 25.0, 10.0);
      vec3 lightColor = vec3(1.0, 1.0, 1.0);
      vec3 ambientColor = vec3(0.2, 0.2, 0.2);
    
      varying vec3 v_Position;
      varying vec3 v_Color;
      varying vec3 v_Normal;
    
      void main() {
        vec3 lightDirection = normalize(lightPosition - v_Position);
        vec3 normal = normalize(v_Normal);
        float incident = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = v_Color * lightColor * incident;
        vec3 ambient = v_Color * ambientColor;
        gl_FragColor = vec4(diffuse + ambient, 1.0);
      }
  `;
  /**
   * Normal vectors arraybuffer
   * @private
   */
  // prettier-ignore
  normals = new Float32Array([
     0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0,  0.0, 0.0, 1.0, // v0-v1-v2-v3 front
     1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0,  1.0, 0.0, 0.0, // v0-v3-v4-v5 right
     0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0,  0.0, 1.0, 0.0, // v0-v5-v6-v1 up
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, // v1-v6-v7-v2 left
     0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0,  0.0,-1.0, 0.0, // v7-v4-v3-v2 down
     0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0,  0.0, 0.0,-1.0, // v4-v7-v6-v5 back
  ]);
  /**
   * Colors arraybuffer
   * @private
   */
  // prettier-ignore
  colors = new Float32Array([
    0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  // front(blue)
    0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  // right(green)
    1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  // left(red)
    1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  // back(yellow)
    1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  // top(white)
    0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  // bottom(cyan)
  ]);
  /**
   * Indices arraybuffer
   * @private
   */
  // prettier-ignore
  indices = new Uint8Array([
     0, 1, 2,   0, 2, 3,    // front
     4, 5, 6,   4, 6, 7,    // right
     8, 9,10,   8,10,11,    // up
    12,13,14,  12,14,15,    // left
    16,17,18,  16,18,19,    // down
    20,21,22,  20,22,23,    // back
  ]);

  /**
   * WebGL2 rendering context
   * @private
   */
  gl = getWebGLContext();
  /**
   * Compiled WebGL program
   * @type {WebGLProgram | undefined}
   * @private
   */
  program;
  /**
   * Attribute location pointer of `a_Position`
   * @type {number | undefined}
   * @private
   */
  aPosition;
  /**
   * Attribute location pointer of `a_Color`
   * @type {number | undefined}
   * @private
   */
  aColor;
  /**
   * Attribute location pointer of `a_Normal`
   * @type {number | undefined}
   * @private
   */
  aNormal;
  /**
   * Uniform location pointer of `u_MvpMatrix`
   * @type {number | undefined}
   * @private
   */
  uMvpMatrix;
  /**
   * Uniform location pointer of `u_ModelMatrix`
   * @type {number | undefined}
   * @private
   */
  uModelMatrix;
  /**
   * Uniform location pointer of `u_NormalMatrix`
   * @type {number | undefined}
   * @private
   */
  uNormalMatrix;
  /**
   * WebGL buffer for normal vectors
   * @type {WebGLBuffer | undefined}
   * @private
   */
  normalsBuffer;
  /**
   * WebGL buffer for colors
   * @type {WebGLBuffer | undefined}
   * @private
   */
  colorsBuffer;
  /**
   * WebGL buffer for indices
   * @type {WebGLBuffer | undefined}
   * @private
   */
  indicesBuffer;
  /**
   * View Projection matrix
   * @private
   */
  vpMatrix = mat4.create();
  /**
   * @private
   */
  initialized = false;

  /**
   * @type {ModelComponent[]}
   * @private
   */
  components = [new Base()];

  /**
   * Last render time
   * @private
   */
  lastRenderTime = 0;

  /**
   * @private
   */
  compile() {
    this.gl.enable(this.gl.DEPTH_TEST);

    this.program = bindWebGLProgram(this.gl, [
      { type: this.gl.VERTEX_SHADER, source: this.vertexShaderSource },
      { type: this.gl.FRAGMENT_SHADER, source: this.fragmentShaderSource },
    ]);

    this.aPosition = this.gl.getAttribLocation(this.program, "a_Position");
    this.aColor = this.gl.getAttribLocation(this.program, "a_Color");
    this.aNormal = this.gl.getAttribLocation(this.program, "a_Normal");
    this.uMvpMatrix = this.gl.getUniformLocation(this.program, "u_MvpMatrix");
    this.uModelMatrix = this.gl.getUniformLocation(this.program, "u_ModelMatrix");
    this.uNormalMatrix = this.gl.getUniformLocation(this.program, "u_NormalMatrix");
  }

  /**
   * @private
   */
  matrix() {
    const viewMatrix = mat4.lookAt(
      mat4.create(),
      vec3.fromValues(30, 40, 40),
      vec3.fromValues(0, 15, 0),
      vec3.fromValues(0, 1, 0)
    );
    const projMatrix = mat4.perspective(
      mat4.create(),
      glMatrix.toRadian(40),
      this.gl.canvas.width / this.gl.canvas.height,
      1,
      100
    );

    mat4.identity(this.vpMatrix);
    mat4.multiply(this.vpMatrix, this.vpMatrix, projMatrix);
    mat4.multiply(this.vpMatrix, this.vpMatrix, viewMatrix);
  }

  /**
   * @private
   */
  buffer() {
    this.normalsBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalsBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.normals, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(this.aNormal, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aNormal);

    this.colorsBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.colorsBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.colors, this.gl.STATIC_DRAW);
    this.gl.vertexAttribPointer(this.aColor, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.enableVertexAttribArray(this.aColor);

    this.indicesBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indicesBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.indices, this.gl.STATIC_DRAW);

    this.gl.enableVertexAttribArray(this.aPosition);
  }

  /**
   * Render current frame
   * @param {number} renderTime Current render time
   * @param {boolean} updateView Recalculate view projection matrix
   * @returns
   */
  render(renderTime = this.lastRenderTime, updateView = false) {
    if (!this.gl) return;

    if (!this.initialized) {
      this.compile();
      this.matrix();
      this.buffer();
      this.initialized = true;
    }
    if (updateView) {
      this.matrix();
    }

    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

    // temporary matrices
    const mvpMatrix = mat4.create();
    const normalMatrix = mat4.create();

    const components = [...this.components];
    while (components.length !== 0) {
      const component = components.shift();

      const verticesBuffer = component.getVerticesBuffer(this.gl);
      const modelMatrix = component.getModelMatrix(renderTime, this.lastRenderTime);

      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, verticesBuffer);
      this.gl.vertexAttribPointer(this.aPosition, 3, this.gl.FLOAT, false, 0, 0);

      mat4.multiply(mvpMatrix, this.vpMatrix, modelMatrix);

      mat4.invert(normalMatrix, modelMatrix);
      mat4.transpose(normalMatrix, normalMatrix);

      this.gl.uniformMatrix4fv(this.uMvpMatrix, false, mvpMatrix);
      this.gl.uniformMatrix4fv(this.uModelMatrix, false, modelMatrix);
      this.gl.uniformMatrix4fv(this.uNormalMatrix, false, normalMatrix);
      this.gl.drawElements(this.gl.TRIANGLES, this.indices.length, this.gl.UNSIGNED_BYTE, 0);

      components.push(...component.getChildrenComponents());
    }

    this.lastRenderTime = renderTime;
    requestAnimationFrame(this.render.bind(this));
  }
}

/**
 * Abstract component class of model component
 * @abstract
 */
class ModelComponent {
  /**
   * Returns vertices arraybuffer of this component
   * @protected
   * @returns {Float32Array} Vertices arraybuffer
   */
  getVertices() {
    throw new Error("Unimplemented method");
  }

  /**
   * Returns model matrix of this component
   * @protected
   * @param {number} renderTime Current render time
   * @param {number} lastRenderTime Last render time
   * @type {mat4} Model matrix
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getModelMatrix(renderTime, lastRenderTime) {
    throw new Error("Unimplemented method");
  }

  /**
   * Returns children components of this components
   * @returns {ModelComponent[]} Children components
   */
  getChildrenComponents() {
    return [];
  }

  /**
   * Cached WebGL buffer
   * @private
   * @type {WebGLBuffer}
   */
  verticesBuffer;
  /**
   * @protected
   * @param {WebGLRenderingContext} gl
   */
  getVerticesBuffer(gl) {
    if (!this.verticesBuffer) {
      this.verticesBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.getVertices(), gl.STATIC_DRAW);
    }

    return this.verticesBuffer;
  }
}

class Base extends ModelComponent {
  /**
   * Vertices arraybuffer of this component
   * @private
   */
  // prettier-ignore
  vertices = new Float32Array([
    5.0, 2.0, 5.0, -5.0, 2.0, 5.0, -5.0, 0.0, 5.0,  5.0, 0.0, 5.0, // v0-v1-v2-v3 front
    5.0, 2.0, 5.0,  5.0, 0.0, 5.0,  5.0, 0.0,-5.0,  5.0, 2.0,-5.0, // v0-v3-v4-v5 right
    5.0, 2.0, 5.0,  5.0, 2.0,-5.0, -5.0, 2.0,-5.0, -5.0, 2.0, 5.0, // v0-v5-v6-v1 up
   -5.0, 2.0, 5.0, -5.0, 2.0,-5.0, -5.0, 0.0,-5.0, -5.0, 0.0, 5.0, // v1-v6-v7-v2 left
   -5.0, 0.0,-5.0,  5.0, 0.0,-5.0,  5.0, 0.0, 5.0, -5.0, 0.0, 5.0, // v7-v4-v3-v2 down
    5.0, 0.0,-5.0, -5.0, 0.0,-5.0, -5.0, 2.0,-5.0,  5.0, 2.0,-5.0  // v4-v7-v6-v5 back
  ])
  /**
   * Model matrix of this component
   * @private
   */
  modelMatrix = mat4.fromRotation(mat4.create(), glMatrix.toRadian(0), vec3.fromValues(0, 1, 0));
  /**
   * @type {ModelComponent[]}
   * @private
   */
  children = [new FirstArm(this.modelMatrix)];

  /**
   * @override
   */
  getVertices() {
    return this.vertices;
  }

  /**
   * @override
   */
  getModelMatrix() {
    return this.modelMatrix;
  }

  /**
   * @override
   */
  getChildrenComponents() {
    return this.children;
  }
}

class FirstArm extends ModelComponent {
  /**
   * Rotate step per second
   */
  static ROTATION_STEP_PER_SECOND = glMatrix.toRadian(40);

  /**
   * Vertices arraybuffer of this component
   * @private
   */
  // prettier-ignore
  vertices = new Float32Array([
    1.5, 10.0, 1.5, -1.5, 10.0, 1.5, -1.5,  0.0, 1.5,  1.5,  0.0, 1.5, // v0-v1-v2-v3 front
    1.5, 10.0, 1.5,  1.5,  0.0, 1.5,  1.5,  0.0,-1.5,  1.5, 10.0,-1.5, // v0-v3-v4-v5 right
    1.5, 10.0, 1.5,  1.5, 10.0,-1.5, -1.5, 10.0,-1.5, -1.5, 10.0, 1.5, // v0-v5-v6-v1 up
   -1.5, 10.0, 1.5, -1.5, 10.0,-1.5, -1.5,  0.0,-1.5, -1.5,  0.0, 1.5, // v1-v6-v7-v2 left
   -1.5,  0.0,-1.5,  1.5,  0.0,-1.5,  1.5,  0.0, 1.5, -1.5,  0.0, 1.5, // v7-v4-v3-v2 down
    1.5,  0.0,-1.5, -1.5,  0.0,-1.5, -1.5, 10.0,-1.5,  1.5, 10.0,-1.5  // v4-v7-v6-v5 back
  ]);
  /**
   * Rotation of the arm
   * @private
   */
  rotation = 0;
  /**
   * Model matrix of this arm
   * @private
   */
  modelMatrix = mat4.create();
  /**
   * Matrix matrix of the {@link Base} component
   * @private
   * @type {mat4}
   */
  baseModelMatrix;
  /**
   * @private
   */
  isArrowLeftPressing = false;
  /**
   * @private
   */
  isArrowRightPressing = false;
  /**
   * @private
   */
  children = [new SecondArm(this.modelMatrix)];

  /**
   * @param {mat4} baseModelMatrix Matrix matrix of the {@link Base} component
   */
  constructor(baseModelMatrix) {
    super();
    this.baseModelMatrix = baseModelMatrix;

    document.addEventListener("keydown", ({ key }) => {
      switch (key) {
        case "ArrowLeft":
          this.isArrowLeftPressing = true;
          break;
        case "ArrowRight":
          this.isArrowRightPressing = true;
          break;
      }
    });
    document.addEventListener("keyup", ({ key }) => {
      switch (key) {
        case "ArrowLeft":
          this.isArrowLeftPressing = false;
          break;
        case "ArrowRight":
          this.isArrowRightPressing = false;
          break;
      }
    });
  }

  /**
   * @override
   */
  getVertices() {
    return this.vertices;
  }

  /**
   * @override
   */
  getModelMatrix(time, lastTime) {
    const offset = (time - lastTime) / 1000;
    const rotation = offset * FirstArm.ROTATION_STEP_PER_SECOND;
    if (this.isArrowLeftPressing) {
      this.rotation -= rotation;
    }
    if (this.isArrowRightPressing) {
      this.rotation += rotation;
    }
    this.rotation %= Math.PI * 2;

    mat4.copy(this.modelMatrix, this.baseModelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, vec3.fromValues(0, 2, 0));
    mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation);
    return this.modelMatrix;
  }

  /**
   * @override
   */
  getChildrenComponents() {
    return this.children;
  }
}

class SecondArm extends ModelComponent {
  /**
   * Rotate step per second
   */
  static ROTATION_STEP_PER_SECOND = glMatrix.toRadian(60);

  /**
   * Vertices arraybuffer of this component
   * @private
   */
  // prettier-ignore
  vertices = new Float32Array([
    2.0, 10.0, 2.0, -2.0, 10.0, 2.0, -2.0,  0.0, 2.0,  2.0,  0.0, 2.0, // v0-v1-v2-v3 front
    2.0, 10.0, 2.0,  2.0,  0.0, 2.0,  2.0,  0.0,-2.0,  2.0, 10.0,-2.0, // v0-v3-v4-v5 right
    2.0, 10.0, 2.0,  2.0, 10.0,-2.0, -2.0, 10.0,-2.0, -2.0, 10.0, 2.0, // v0-v5-v6-v1 up
   -2.0, 10.0, 2.0, -2.0, 10.0,-2.0, -2.0,  0.0,-2.0, -2.0,  0.0, 2.0, // v1-v6-v7-v2 left
   -2.0,  0.0,-2.0,  2.0,  0.0,-2.0,  2.0,  0.0, 2.0, -2.0,  0.0, 2.0, // v7-v4-v3-v2 down
    2.0,  0.0,-2.0, -2.0,  0.0,-2.0, -2.0, 10.0,-2.0,  2.0, 10.0,-2.0  // v4-v7-v6-v5 back
  ]);
  /**
   * Rotation of the arm
   * @private
   */
  rotation = glMatrix.toRadian(30);
  /**
   * Model matrix of this arm
   * @private
   */
  modelMatrix = mat4.create();
  /**
   * Matrix matrix of the {@link Base} component
   * @private
   * @type {mat4}
   */
  baseModelMatrix;
  /**
   * @private
   */
  isArrowUpPressing = false;
  /**
   * @private
   */
  isArrowDownPressing = false;
  /**
   * @private
   */
  children = [new Palm(this.modelMatrix)];

  /**
   * @param {mat4} baseModelMatrix Matrix matrix of the {@link Base} component
   */
  constructor(baseModelMatrix) {
    super();
    this.baseModelMatrix = baseModelMatrix;

    document.addEventListener("keydown", ({ key }) => {
      switch (key) {
        case "ArrowUp":
          this.isArrowUpPressing = true;
          break;
        case "ArrowDown":
          this.isArrowDownPressing = true;
          break;
      }
    });
    document.addEventListener("keyup", ({ key }) => {
      switch (key) {
        case "ArrowUp":
          this.isArrowUpPressing = false;
          break;
        case "ArrowDown":
          this.isArrowDownPressing = false;
          break;
      }
    });
  }

  /**
   * @override
   */
  getVertices() {
    return this.vertices;
  }

  /**
   * @override
   */
  getModelMatrix(time, lastTime) {
    const offset = (time - lastTime) / 1000;
    const rotation = offset * SecondArm.ROTATION_STEP_PER_SECOND;
    if (this.isArrowUpPressing) {
      this.rotation -= rotation;
    }
    if (this.isArrowDownPressing) {
      this.rotation += rotation;
    }
    this.rotation = Math.min(Math.max(this.rotation, -Math.PI * 0.7), Math.PI * 0.7);

    mat4.copy(this.modelMatrix, this.baseModelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, vec3.fromValues(0, 10, 0));
    mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation);
    return this.modelMatrix;
  }

  /**
   * @override
   */
  getChildrenComponents() {
    return this.children;
  }
}

class Palm extends ModelComponent {
  /**
   * Vertices arraybuffer of this component
   * @private
   */
  // prettier-ignore
  vertices = new Float32Array([
    1.0, 2.0, 3.0, -1.0, 2.0, 3.0, -1.0, 0.0, 3.0,  1.0, 0.0, 3.0, // v0-v1-v2-v3 front
    1.0, 2.0, 3.0,  1.0, 0.0, 3.0,  1.0, 0.0,-3.0,  1.0, 2.0,-3.0, // v0-v3-v4-v5 right
    1.0, 2.0, 3.0,  1.0, 2.0,-3.0, -1.0, 2.0,-3.0, -1.0, 2.0, 3.0, // v0-v5-v6-v1 up
   -1.0, 2.0, 3.0, -1.0, 2.0,-3.0, -1.0, 0.0,-3.0, -1.0, 0.0, 3.0, // v1-v6-v7-v2 left
   -1.0, 0.0,-3.0,  1.0, 0.0,-3.0,  1.0, 0.0, 3.0, -1.0, 0.0, 3.0, // v7-v4-v3-v2 down
    1.0, 0.0,-3.0, -1.0, 0.0,-3.0, -1.0, 2.0,-3.0,  1.0, 2.0,-3.0  // v4-v7-v6-v5 back
  ]);
  /**
   * Rotation of the arm
   * @private
   */
  rotation = glMatrix.toRadian(90);
  /**
   * Model matrix of this arm
   * @private
   */
  modelMatrix = mat4.create();
  /**
   * Matrix matrix of the {@link Base} component
   * @private
   * @type {mat4}
   */
  baseModelMatrix;
  /**
   * @private
   */
  isZPressing = false;
  /**
   * @private
   */
  isXPressing = false;
  /**
   * @private
   */
  children = [new Finger(this.modelMatrix, 0), new Finger(this.modelMatrix, 1)];

  /**
   * @param {mat4} baseModelMatrix Matrix matrix of the {@link Base} component
   */
  constructor(baseModelMatrix) {
    super();
    this.baseModelMatrix = baseModelMatrix;

    document.addEventListener("keydown", ({ key }) => {
      switch (key) {
        case "z":
          this.isZPressing = true;
          break;
        case "x":
          this.isXPressing = true;
          break;
      }
    });
    document.addEventListener("keyup", ({ key }) => {
      switch (key) {
        case "z":
          this.isZPressing = false;
          break;
        case "x":
          this.isXPressing = false;
          break;
      }
    });
  }

  /**
   * @override
   */
  getVertices() {
    return this.vertices;
  }

  /**
   * @override
   */
  getModelMatrix(time, lastTime) {
    const offset = (time - lastTime) / 1000;
    const rotation = offset * SecondArm.ROTATION_STEP_PER_SECOND;
    if (this.isZPressing) {
      this.rotation -= rotation;
    }
    if (this.isXPressing) {
      this.rotation += rotation;
    }
    this.rotation %= Math.PI * 2;

    mat4.copy(this.modelMatrix, this.baseModelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, vec3.fromValues(0, 10, 0));
    mat4.rotateY(this.modelMatrix, this.modelMatrix, this.rotation);
    return this.modelMatrix;
  }

  /**
   * @override
   */
  getChildrenComponents() {
    return this.children;
  }
}

class Finger extends ModelComponent {
  /**
   * Vertices arraybuffer of this component
   * @private
   */
  // prettier-ignore
  vertices = new Float32Array([
    0.5, 2.0, 0.5, -0.5, 2.0, 0.5, -0.5, 0.0, 0.5,  0.5, 0.0, 0.5, // v0-v1-v2-v3 front
    0.5, 2.0, 0.5,  0.5, 0.0, 0.5,  0.5, 0.0,-0.5,  0.5, 2.0,-0.5, // v0-v3-v4-v5 right
    0.5, 2.0, 0.5,  0.5, 2.0,-0.5, -0.5, 2.0,-0.5, -0.5, 2.0, 0.5, // v0-v5-v6-v1 up
   -0.5, 2.0, 0.5, -0.5, 2.0,-0.5, -0.5, 0.0,-0.5, -0.5, 0.0, 0.5, // v1-v6-v7-v2 left
   -0.5, 0.0,-0.5,  0.5, 0.0,-0.5,  0.5, 0.0, 0.5, -0.5, 0.0, 0.5, // v7-v4-v3-v2 down
    0.5, 0.0,-0.5, -0.5, 0.0,-0.5, -0.5, 2.0,-0.5,  0.5, 2.0,-0.5  // v4-v7-v6-v5 back
  ]);
  /**
   * Rotation of the arm
   * @private
   */
  rotation = 0;
  /**
   * Model matrix of this arm
   * @private
   */
  modelMatrix = mat4.create();
  /**
   * Matrix matrix of the {@link Base} component
   * @private
   * @type {mat4}
   */
  baseModelMatrix;
  /**
   * @private
   * @type {number}
   */
  fingerIndex;
  /**
   * @private
   */
  isCPressing = false;
  /**
   * @private
   */
  isVPressing = false;

  /**
   * @param {mat4} baseModelMatrix Matrix matrix of the {@link Base} component
   * @param {number} fingerIndex Index of this finger
   */
  constructor(baseModelMatrix, fingerIndex) {
    super();
    this.baseModelMatrix = baseModelMatrix;
    this.fingerIndex = fingerIndex;

    document.addEventListener("keydown", ({ key }) => {
      switch (key) {
        case "c":
          this.isCPressing = true;
          break;
        case "v":
          this.isVPressing = true;
          break;
      }
    });
    document.addEventListener("keyup", ({ key }) => {
      switch (key) {
        case "c":
          this.isCPressing = false;
          break;
        case "v":
          this.isVPressing = false;
          break;
      }
    });
  }

  /**
   * @override
   */
  getVertices() {
    return this.vertices;
  }

  /**
   * @override
   */
  getModelMatrix(time, lastTime) {
    const offset = (time - lastTime) / 1000;
    const rotation = offset * SecondArm.ROTATION_STEP_PER_SECOND;
    if (this.isVPressing) {
      this.rotation += this.fingerIndex === 0 ? -rotation : rotation;
    }
    if (this.isCPressing) {
      this.rotation += this.fingerIndex === 0 ? rotation : -rotation;
    }
    this.rotation = Math.min(Math.max(this.rotation, -Math.PI * 0.3), Math.PI * 0.3);
    const translateZ = this.fingerIndex === 0 ? -2 : 2;

    mat4.copy(this.modelMatrix, this.baseModelMatrix);
    mat4.translate(this.modelMatrix, this.modelMatrix, vec3.fromValues(0, 2, translateZ));
    mat4.rotateX(this.modelMatrix, this.modelMatrix, this.rotation);
    return this.modelMatrix;
  }
}

const model = new ModelRender();
model.render();

getCanvasResizeObserver(model.render.bind(model, true));
