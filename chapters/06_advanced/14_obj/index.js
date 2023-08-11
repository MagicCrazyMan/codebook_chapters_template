import { glMatrix, mat4, vec3 } from "gl-matrix";
import { PerspectiveCamera } from "../../libs/camera/perspective";
import {
  compileShader,
  createProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";
import { PointLight } from "../../libs/lights/pointlight";
import { TransformObject } from "../../libs/core/transform_object";

class MTLPhongMaterial {
  /**
   * @private
   */
  static VERTEX_SHADER_SOURCE = `
    attribute vec4 a_Position;
    attribute vec4 a_Normal;
    
    uniform vec4 u_Color;
    uniform mat4 u_MvpMatrix;
    uniform mat4 u_ModelMatrix;
    uniform mat4 u_NormalMatrix;

    varying vec3 v_Position;
    varying vec3 v_Normal;
    varying vec4 v_Color;

    void main() {
      gl_Position = u_MvpMatrix * a_Position;
      v_Position = vec3(u_ModelMatrix * a_Position);
      v_Normal = vec3(u_NormalMatrix * a_Normal);
      v_Color = u_Color;
    }
  `;
  /**
   * @private
   */
  static FRAGMENT_SHADER_SOURCE = `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
    #else
      precision mediump float;
    #endif

    uniform vec3 u_PointLightColor;
    uniform vec3 u_PointLightPosition;
    uniform float u_PointLightIntensity;
    uniform vec3 u_AmbientLightColor;

    varying vec3 v_Position;
    varying vec3 v_Normal;
    varying vec4 v_Color;

    void main() {
      float lightDistance = distance(v_Position, u_PointLightPosition);
      // quadratic power of distance
      float lightPower = u_PointLightIntensity / pow(lightDistance, 2.0);

      vec3 normal = normalize(v_Normal);
      vec3 lightDirection = normalize(u_PointLightPosition - v_Position);
      float diffuseIntensity = max(dot(lightDirection, normal), 0.0);
      vec3 diffuse = v_Color.rgb * u_PointLightColor * lightPower * diffuseIntensity;

      vec3 ambient = v_Color.rgb * u_AmbientLightColor;

      gl_FragColor = vec4(diffuse + ambient, v_Color.a);
    }
  `;
  /**
   * @private
   * @type {WebGLProgram | null}
   */
  static program = null;
  /**
   * @private
   * @type {Record<string, number> | null}
   */
  static attributeLocations = null;
  /**
   * @private
   * @type {Record<string, WebGLUniformLocation> | null}
   */
  static uniformLocations = null;

  /**
   *
   * @param {WebGL2RenderingContext} gl
   * @returns
   */
  static getProgram(gl) {
    if (MTLPhongMaterial.program) return MTLPhongMaterial.program;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, MTLPhongMaterial.VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      MTLPhongMaterial.FRAGMENT_SHADER_SOURCE
    );
    const program = createProgram(gl, [vertexShader, fragmentShader]);

    MTLPhongMaterial.program = program;
    MTLPhongMaterial.attributeLocations = {
      a_Position: gl.getAttribLocation(program, "a_Position"),
      a_Normal: gl.getAttribLocation(program, "a_Normal"),
    };
    MTLPhongMaterial.uniformLocations = {
      u_Color: gl.getUniformLocation(program, "u_Color"),
      u_MvpMatrix: gl.getUniformLocation(program, "u_MvpMatrix"),
      u_ModelMatrix: gl.getUniformLocation(program, "u_ModelMatrix"),
      u_NormalMatrix: gl.getUniformLocation(program, "u_NormalMatrix"),
      u_AmbientLightColor: gl.getUniformLocation(program, "u_AmbientLightColor"),
      u_PointLightColor: gl.getUniformLocation(program, "u_PointLightColor"),
      u_PointLightPosition: gl.getUniformLocation(program, "u_PointLightPosition"),
      u_PointLightIntensity: gl.getUniformLocation(program, "u_PointLightIntensity"),
    };

    return MTLPhongMaterial.program;
  }

  /**
   * @type {[number, number, number]}
   */
  ambientColor;
  /**
   * @type {[number, number, number]}
   */
  diffuseColor;
  /**
   * @type {[number, number, number]}
   */
  specularColor;
  /**
   * @type {number}
   */
  specularExponent;
  /**
   * @type {number}
   */
  opaque;
  /**
   * @type {number}
   */
  opticalDensity;
  /**
   * @type {number}
   */
  illumination;

  constructor(
    ambientColor,
    diffuseColor,
    specularColor,
    specularExponent,
    opaque,
    opticalDensity,
    illumination
  ) {
    this.ambientColor = ambientColor;
    this.diffuseColor = diffuseColor;
    this.specularColor = specularColor;
    this.specularExponent = specularExponent;
    this.opaque = opaque;
    this.opticalDensity = opticalDensity;
    this.illumination = illumination;
  }

  /**
   * @typedef {Object} RenderState
   * @property {PerspectiveCamera} camera
   * @property {PointLight} light
   * @property {OBJInstance} instance
   * @property {mat4} mvpMatrix
   */

  /**
   * @private
   */
  _normalMatrix = mat4.create();
  /**
   *
   * @param {WebGL2RenderingContext} gl
   * @param {OBJFace} geometry
   * @param {RenderState} state
   */
  render(gl, geometry, state) {
    gl.useProgram(MTLPhongMaterial.getProgram(gl));

    // bind mvp matrix
    gl.uniformMatrix4fv(MTLPhongMaterial.uniformLocations["u_MvpMatrix"], false, state.mvpMatrix);
    // bind model matrix
    gl.uniformMatrix4fv(
      MTLPhongMaterial.uniformLocations["u_ModelMatrix"],
      false,
      state.instance.modelMatrix
    );
    // bind normal matrix
    mat4.identity(this._normalMatrix);
    mat4.invert(this._normalMatrix, state.instance.modelMatrix);
    mat4.transpose(this._normalMatrix, this._normalMatrix);
    gl.uniformMatrix4fv(
      MTLPhongMaterial.uniformLocations["u_NormalMatrix"],
      false,
      this._normalMatrix
    );
    // bind color
    gl.uniform4f(
      MTLPhongMaterial.uniformLocations["u_Color"],
      this.diffuseColor[0],
      this.diffuseColor[1],
      this.diffuseColor[2],
      this.opaque
    );
    // bind ambient color
    gl.uniform3fv(MTLPhongMaterial.uniformLocations["u_AmbientLightColor"], this.ambientColor);
    // bind point light color
    gl.uniform3fv(MTLPhongMaterial.uniformLocations["u_PointLightColor"], state.light.lightColor);
    // bind point light position
    gl.uniform3fv(MTLPhongMaterial.uniformLocations["u_PointLightPosition"], state.light.position);
    // bind point light power
    gl.uniform1f(
      MTLPhongMaterial.uniformLocations["u_PointLightIntensity"],
      state.light.getLightIntensity()
    );

    // bind vertices buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getVerticesBuffer(gl));
    gl.vertexAttribPointer(
      MTLPhongMaterial.attributeLocations["a_Position"],
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(MTLPhongMaterial.attributeLocations["a_Position"]);
    // bind normals buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, geometry.getNormalsBuffer(gl));
    gl.vertexAttribPointer(
      MTLPhongMaterial.attributeLocations["a_Normal"],
      3,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(MTLPhongMaterial.attributeLocations["a_Normal"]);

    // draw
    gl.drawArrays(gl.TRIANGLES, 0, geometry.vertices.length / 3);
  }
}

/**
 * OBJ face geometry that every vertex share the same normal.
 */
class OBJFace {
  /**
   * Flatten geometric vertices values,
   * each vertex contains 3 components: x, y and z
   * @type {Float32Array}
   */
  vertices;
  /**
   * Flatten texture vertices values,
   * each vertex contains 3 components: u, v and w
   * @type {Float32Array}
   */
  uvs;
  /**
   * Flatten normal vertices values,
   * each vertex contains 3 components: i, j and k
   * @type {Float32Array}
   */
  normals;
  /**
   * @type {string | null}
   * @readonly
   */
  material;
  /**
   * @type {string | null}
   * @readonly
   */
  objectName;
  /**
   * @type {string[]}
   * @readonly
   */
  groupNames;

  /**
   * @type {WebGLBuffer | null}
   * @private
   */
  _verticesBuffer = null;

  /**
   *
   * @param {WebGLRenderingContext} gl
   * @returns
   */
  getVerticesBuffer(gl) {
    if (!this._verticesBuffer) {
      this._verticesBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._verticesBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this._verticesBuffer;
  }

  /**
   * @type {WebGLBuffer | null}
   * @private
   */
  _normalsBuffer = null;

  /**
   *
   * @param {WebGLRenderingContext} gl
   * @returns
   */
  getNormalsBuffer(gl) {
    if (!this._normalsBuffer) {
      this._normalsBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._normalsBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this._normalsBuffer;
  }

  constructor(vertices, uvs, normals, material, objectName, groupNames) {
    this.vertices = vertices;
    this.uvs = uvs;
    this.normals = normals;
    this.material = material;
    this.objectName = objectName;
    this.groupNames = groupNames;
  }
}

class OBJInstance extends TransformObject{
  /**
   * Default material.
   * @readonly
   * @public
   */
  static DEFAULT_MATERIAL = new MTLPhongMaterial(
    [1, 1, 1],
    [1, 1, 1],
    [0, 0, 0],
    96.078431,
    1,
    1,
    0
  );

  /**
   * Map of all materials
   * @type {Map<string, MTLPhongMaterial>}
   */
  materials;
  /**
   * List of geometries.
   * @type {OBJFace[]}
   */
  geometries;

  constructor(geometries, materials) {
    this.materials = materials;
    this.geometries = geometries;
  }

  /**
   * @private
   */
  _tempMvpMatrix = mat4.create();
  /**
   *
   * @param {WebGL2RenderingContext} gl
   * @param {PerspectiveCamera} camera
   * @param {PointLight} light
   */
  render(gl, camera, light) {
    mat4.identity(this._tempMvpMatrix);
    mat4.multiply(this._tempMvpMatrix, this._tempMvpMatrix, camera.viewProjectionMatrix);
    mat4.multiply(this._tempMvpMatrix, this._tempMvpMatrix, this.modelMatrix);

    const state = {
      light,
      camera,
      instance: this,
      mvpMatrix: this._tempMvpMatrix,
    };
    this.geometries.forEach((geometry) => {
      const mtl = this.materials.get(geometry.material) ?? OBJInstance.DEFAULT_MATERIAL;
      mtl.render(gl, geometry, state);
    });
  }
}

class CommonTokenizer {
  /**
   * @type {string}
   * @readonly
   */
  str = 0;
  /**
   * @type {number}
   * @protected
   */
  line = 0;
  /**
   * @type {number}
   * @protected
   */
  index = 0;

  /**
   * @type {string}
   * @readonly
   */
  tokenSplitter;

  /**
   * Constructs a common string tokenizer.
   * @param {string} str raw string
   * @param {string} tokenSplitter token splitter
   */
  constructor(str, tokenSplitter) {
    this.str = str;
    this.tokenSplitter = tokenSplitter;
  }

  /**
   * Find next token
   * @returns {[string, boolean, boolean]} array containing token string, end of line marker and end of file marker
   */
  nextToken() {
    // find next token type
    let consumed = 0;
    let tokenIndex = -1;
    let tokenLength = 0;
    let eol = false;
    let eof = false;

    for (;;) {
      const char = this.str.charAt(this.index + consumed);

      if (char === "") {
        // meet empty string, reach EOL, return
        eol = true;
        eof = true;
        break;
      } else if (char === this.tokenSplitter) {
        consumed++;
        if (tokenIndex !== -1) break;
      } else if (char === "\n") {
        consumed++;
        this.line++;
        if (tokenIndex !== -1) {
          eol = true;
          break;
        }
      } else if (char === "\r" && this.str.charAt(this.index + consumed + 1) === "\n") {
        consumed += 2;
        this.line++;
        if (tokenIndex !== -1) {
          eol = true;
          break;
        }
      } else {
        if (tokenIndex === -1) {
          tokenIndex = this.index + consumed;
        }

        tokenLength++;
        consumed++;
      }
    }

    const token = this.str.slice(tokenIndex, tokenIndex + tokenLength);
    this.index += consumed;
    return [token, eol, eof];
  }

  /**
   * Skip current line
   */
  skipLine() {
    let consumed = 0;
    for (;;) {
      const char = this.str.charAt(this.index + consumed);
      if (char === "\n") {
        consumed++;
        break;
      } else if (char === "\r" && this.str.charAt(this.index + consumed + 1) === "\n") {
        consumed += 2;
        break;
      } else if (char === "") {
        break;
      } else {
        consumed++;
      }
    }

    this.index += consumed;
  }
}

class OBJTokenizer extends CommonTokenizer {
  /**
   * @typedef {Object} Options
   * @property {string[]} [mtls] prefetch .mtl files in raw string
   * @property {boolean} [mtlsFromObj] fetch .mtl files parsed from .obj file from remote.
   * @property {string} [mtlBaseUrl] base url when fetching .mtl files from remote.
   */

  /**
   * @type {Options}
   * @private
   */
  options;

  /**
   * @enum {number}
   * @private
   */
  static GeometryType = {
    NotStart: -1,
    Point: 0,
    Line: 1,
    Face: 2,
  };

  /**
   * @type {number[]}
   * @private
   */
  aVertices = [];
  /**
   * @type {number[]}
   * @private
   */
  aUVs = [];
  /**
   * @type {number[]}
   * @private
   */
  aNormals = [];
  /**
   * @type {number[]}
   * @private
   */
  aParams = [];

  /**
   * @type {number}
   * @private
   */
  type = OBJTokenizer.GeometryType.NotStart;
  /**
   * @type {number[]}
   * @private
   */
  vertices = [];
  /**
   * @type {number[]}
   * @private
   */
  uvs = [];
  /**
   * @type {number[]}
   * @private
   */
  normals = [];
  /**
   * @type {number[]}
   * @private
   */
  params = [];
  /**
   * @type {string | null}
   * @private
   */
  material = null;
  /**
   * @type {string | null}
   * @private
   */
  objectName = null;
  /**
   * @type {string[] | null}
   * @private
   */
  groupNames = null;

  /**
   * @type {string[]}
   * @private
   */
  materials = [];
  /**
   * @type {OBJFace[]}
   * @private
   */
  geometries = [];

  /**
   * Constructs a .obj string tokenizer.
   * @param {string} obj .obj file in raw string
   * @param {Options} options options
   */
  constructor(obj, options = {}) {
    super(obj, " ");
    this.materials = options.mtls ?? [];
    this.options = options;
  }

  /**
   * Parses .obj file.
   *
   * If parsed already, last parsed result return directly.
   * Constructs a new tokenizer if you want to parse again.
   */
  async parse() {
    for (;;) {
      const [type, eol, eof] = this.nextToken();
      if (eof) break;

      if (type === "#") {
        this.skipLine();
      } else {
        if (eol) throw new Error(`unexpected end of line in line ${this.line + 1}`);

        if (type === "v") {
          this.parseGeometricVertex();
        } else if (type === "vt") {
          this.parseTextureVertex();
        } else if (type === "vn") {
          this.parseNormalVertex();
        } else if (type === "vp") {
          this.parseParameterVertex();
        } else if (type === "p") {
          // this.parsePoint();
          throw new Error(`unimplemented point element`);
        } else if (type === "l") {
          // this.parseLine();
          throw new Error(`unimplemented line element`);
        } else if (type === "f") {
          if (
            this.type !== OBJTokenizer.GeometryType.NotStart &&
            this.type !== OBJTokenizer.GeometryType.Face
          ) {
            this.saveGroup();
          }

          this.parseFace();
        } else if (type === "o") {
          if (this.type !== OBJTokenizer.GeometryType.NotStart) {
            this.saveGroup();
          }

          this.parseObjectName();
        } else if (type === "g") {
          if (this.type !== OBJTokenizer.GeometryType.NotStart) {
            this.saveGroup();
          }

          this.parseGroupNames();
        } else if (type === "s") {
          // enable smoothing group using Phong Shading in default for all face
          this.skipLine();
        } else if (type === "mtllib") {
          await this.parseMaterialLibraries();
        } else if (type === "usemtl") {
          if (this.type !== OBJTokenizer.GeometryType.NotStart) {
            this.saveGroup();
          }

          this.parseUseMaterial();
        } else {
          console.warn(`unsupported type '${type}' in line ${this.line + 1}`);
          this.skipLine();
        }
      }
    }

    if (this.type !== OBJTokenizer.GeometryType.NotStart) {
      this.saveGroup();
    }

    // parse mtls
    const parsedMaterials = new Map();
    this.materials.forEach((mtl) => {
      const materials = new MTLTokenizer(mtl).parse();
      materials.forEach((v, k) => {
        parsedMaterials.set(k, v);
      });
    });

    const instance = new OBJInstance(this.geometries, parsedMaterials);
    this.reset(true);

    return instance;
  }

  _colorVertexWarnCount = 0;
  /**
   * Parse geometric vertex
   * @private
   */
  parseGeometricVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line + 1} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 3) {
      this.aVertices.push(...numbers);
    } else if (numbers.length === 4) {
      this.aVertices.push(
        numbers[0] / numbers[3],
        numbers[1] / numbers[3],
        numbers[2] / numbers[3]
      );
    } else if (numbers.length === 6) {
      this.aVertices.push(...numbers.slice(0, 3));

      if (this._colorVertexWarnCount === 0) {
        console.warn(`color values of geometric vertex ignored in line ${this.line + 1}`);
        this._colorVertexWarnCount++;
      }
    } else {
      throw new Error(`unexpected number size of geometric vertex in line ${this.line + 1}`);
    }
  }

  /**
   * Parse texture vertex
   * @private
   */
  parseTextureVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line + 1} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 1) {
      this.aUVs.push(numbers[0], 0, 0);
    } else if (numbers.length === 2) {
      this.aUVs.push(...numbers, 0);
    } else if (numbers.length === 3) {
      this.aUVs.push(...numbers);
    } else {
      throw new Error(`unexpected number size of texture vertex in line ${this.line + 1}`);
    }
  }

  /**
   * Parse normal vertex
   * @private
   */
  parseNormalVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line + 1} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 3) {
      this.aNormals.push(...numbers);
    } else {
      throw new Error(`unexpected number size of normal vertex in line ${this.line + 1}`);
    }
  }

  /**
   * Parse parameter vertex
   * @private
   */
  parseParameterVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line + 1} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 2) {
      this.aParams.push(...numbers, 1);
    } else if (numbers.length === 3) {
      this.aParams.push(...numbers);
    } else {
      throw new Error(`unexpected number size of parameter vertex in line ${this.line + 1}`);
    }
  }

  /**
   * Parse material libraries
   * @private
   */
  async parseMaterialLibraries() {
    const mtls = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      mtls.push(token);
      if (eol) break;
    }

    if (this.options.mtlsFromObj) {
      try {
        const requests = mtls.map((mtl) =>
          fetch(`${this.options.mtlBaseUrl}/${mtl}`).then((res) => {
            if (res.ok) {
              return res.text();
            } else {
              throw new Error(`failed to fetch mtl file from remote: ${res.statusText}`);
            }
          })
        );
        this.materials.push(...(await Promise.all(requests)));
      } catch (e) {
        console.warn(`fetch mtl file from remote failed, mtl file ignored`);
        console.error(e);
      }
    }
  }

  /**
   * Parse object name and set as activating.
   * @private
   */
  parseObjectName() {
    let tokens = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      tokens.push(token);
      if (eol) break;
    }

    this.objectName = tokens.join(" ");
  }

  /**
   * Parse group names, add to activating object and set groups as activating.
   * If no object activating, create a new default object with name `undefined`.
   * @private
   */
  parseGroupNames() {
    const groupNames = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      groupNames.push(token);
      if (eol) break;
    }

    this.groupNames = groupNames;
  }

  /**
   * Parse use material and set as activating geometry.
   * @private
   */
  parseUseMaterial() {
    let tokens = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      tokens.push(token);
      if (eol) break;
    }

    this.material = tokens.join(" ");
  }

  /**
   * Parse point and add into all activating groups.
   * If no groups activating, create and add into default group.
   */
  // parsePoint() {
  //   const indices = [];
  //   for (;;) {
  //     const [token, eol] = this.nextToken();

  //     const index = parseInt(token, 10);
  //     if (isNaN(index))
  //       throw new Error(`token ${token} in line ${this.line + 1} is not a geometric vertices index`);
  //     indices.push(index);

  //     if (eol) break;
  //   }

  //   const geometry = new OBJGeometry(OBJGeometryType.Point);
  //   geometry.geometricIndices = indices;
  //   geometry.material = this.activatingMaterial;
  //   this.getActivatingGroups().forEach((group) => {
  //     group.geometries.push(geometry);
  //   });
  // }

  /**
   * Parse line and add into all activating groups.
   * If no groups activating, create and add into default group.
   */
  // parseLine() {
  //   let hasTextureIndices = false;
  //   const geometricIndices = [];
  //   const textureIndices = [];
  //   for (let i = 0; ; i++) {
  //     const [token, eol] = this.nextToken();
  //     const [v, vt] = token.split("/");

  //     if (i === 0) {
  //       hasTextureIndices = vt && vt.length !== 0;
  //     }

  //     // verify texture index
  //     if (hasTextureIndices === (vt === void 0)) {
  //       throw new Error(`unexpected geometric and texture index pair in line ${this.line + 1}`);
  //     }

  //     // verify geometric index
  //     const geometricIndex = parseInt(v, 10);
  //     if (isNaN(geometricIndex))
  //       throw new Error(`token ${v} in line ${this.line + 1} is not a geometric vertices index`);
  //     geometricIndices.push(geometricIndex);

  //     if (vt) {
  //       const textureIndex = parseInt(vt, 10);
  //       if (isNaN(textureIndex))
  //         throw new Error(`token ${vt} in line ${this.line + 1} is not a texture vertices index`);

  //       textureIndices.push(textureIndex);
  //     }

  //     if (eol) break;
  //   }

  //   if (geometricIndices.length < 2) {
  //     throw new Error(`at least 2 vertices for a line geometry in line ${this.line + 1}`);
  //   }

  //   const geometry = new OBJGeometry(OBJGeometryType.Line);
  //   geometry.geometricIndices = geometricIndices;
  //   geometry.textureIndices = textureIndices.length === 0 ? null : textureIndices;
  //   geometry.material = this.activatingMaterial;
  //   this.getActivatingGroups().forEach((group) => {
  //     group.geometries.push(geometry);
  //   });
  // }

  /**
   * Parse face and add into all activating groups.
   * If no groups activating, create and add into default group.
   * @private
   */
  parseFace() {
    this.type = OBJTokenizer.GeometryType.Face;

    let hasTextureIndices = false;
    let hasNormalIndices = false;
    const vIndices = [];
    const vtIndices = [];
    const vnIndices = [];
    for (let i = 0; ; i++) {
      const [token, eol] = this.nextToken();
      const [v, vt, vn] = token.split("/");

      if (i === 0) {
        hasTextureIndices = !!vt;
        hasNormalIndices = !!vn;
      }

      if (hasTextureIndices === !vt || hasNormalIndices === !vn) {
        throw new Error(
          `unexpected geometric, texture and normal index pair in line ${this.line + 1}`
        );
      }

      // parse geometric index
      let geometricIndex = parseInt(v, 10) - 1;
      if (isNaN(geometricIndex))
        throw new Error(`token ${v} in line ${this.line + 1} is not a geometric vertices index`);
      if (geometricIndex < 0) geometricIndex = this.aVertices.length + geometricIndex;
      vIndices.push(geometricIndex);

      // parse texture index
      if (vt) {
        let textureIndex = parseInt(vt, 10) - 1;
        if (isNaN(textureIndex))
          throw new Error(`token ${vt} in line ${this.line + 1} is not a texture vertices index`);
        if (textureIndex < 0) textureIndex = this.aUVs.length + geometricIndex;
        vtIndices.push(textureIndex);
      }

      // parse normal index
      if (vn) {
        let normalIndex = parseInt(vn, 10) - 1;
        if (isNaN(normalIndex))
          throw new Error(`token ${vn} in line ${this.line + 1} is not a normal vertices index`);
        if (normalIndex < 0) normalIndex = this.aVertices.length + normalIndex;
        vnIndices.push(normalIndex);
      }

      if (eol) break;
    }

    if (vIndices.length < 3) {
      throw new Error(
        `face geometry requires at least 3 geometric vertices in line ${this.line + 1}`
      );
    }

    let normal;
    if (vnIndices.length !== 0) {
      normal = this.aNormals.slice(vnIndices[0] * 3, (vnIndices[0] + 1) * 3);
    } else {
      // calculate from triangle if not existed
      const v0 = this.aVertices.slice(vIndices[0] * 3, (vIndices[0] + 1) * 3);
      const v1 = this.aVertices.slice(vIndices[1] * 3, (vIndices[1] + 1) * 3);
      const v2 = this.aVertices.slice(vIndices[2] * 3, (vIndices[2] + 1) * 3);

      const p0 = vec3.fromValues(v0[0], v0[1], v0[2]);
      const p1 = vec3.fromValues(v1[0], v1[1], v1[2]);
      const p2 = vec3.fromValues(v2[0], v2[1], v2[2]);

      const d0 = vec3.subtract(p0, p1, p0);
      const d1 = vec3.subtract(p1, p2, p1);

      const n = vec3.cross(d0, d0, d1);
      vec3.normalize(n, n);
      normal = n;
    }

    for (let i = 0; i < vIndices.length - 2; i++) {
      const i0 = 0;
      const i1 = i + 1;
      const i2 = i + 2;

      const v0 = this.aVertices.slice(vIndices[i0] * 3, (vIndices[i0] + 1) * 3);
      const v1 = this.aVertices.slice(vIndices[i1] * 3, (vIndices[i1] + 1) * 3);
      const v2 = this.aVertices.slice(vIndices[i2] * 3, (vIndices[i2] + 1) * 3);
      this.vertices.push(...v0, ...v1, ...v2);

      this.normals.push(...normal, ...normal, ...normal);

      if (vtIndices.length !== 0) {
        const vt0 = this.aVertices.slice(vtIndices[i0] * 3, (vtIndices[i0] + 1) * 3);
        const vt1 = this.aVertices.slice(vtIndices[i1] * 3, (vtIndices[i1] + 1) * 3);
        const vt2 = this.aVertices.slice(vtIndices[i2] * 3, (vtIndices[i2] + 1) * 3);
        this.uvs.push(...vt0, ...vt1, ...vt2);
      }
    }
  }

  /**
   * Reset status.
   * @private
   * @param {boolean} global is reset all data
   */
  reset(global = false) {
    this.vertices = [];
    this.uvs = [];
    this.normals = [];
    this.params = [];
    this.type = OBJTokenizer.GeometryType.NotStart;

    if (global) {
      this.aVertices = [];
      this.aNormals = [];
      this.aUVs = [];
      this.aParams = [];
      this.geometries = [];
      this.materials = [];
      this.material = null;
      this.objectName = null;
      this.groupNames = null;
    }
  }

  /**
   * Save current OBJ group
   * @private
   */
  saveGroup() {
    let geom;
    switch (this.type) {
      case OBJTokenizer.GeometryType.Face: {
        geom = new OBJFace(
          new Float32Array(this.vertices),
          new Float32Array(this.uvs),
          new Float32Array(this.normals),
          this.material,
          this.objectName,
          this.groupNames
        );
        break;
      }
      default:
        throw new Error(`unsupported geometry type ${this.type} in line ${this.line + 1}`);
    }

    this.geometries.push(geom);
    this.reset();
  }
}
class MTLTokenizer extends CommonTokenizer {
  /**
   * @type {Map<string, MTLPhongMaterial>}
   * @private
   */
  materials = null;

  /**
   * @type {MTLPhongMaterial | null}
   * @private
   */
  activatingMaterial = null;

  /**
   * Construct a .mtl file tokenizer
   * @param {string} mtl .mtl file raw string
   */
  constructor(mtl) {
    super(mtl, " ");
  }

  /**
   * Parses .mtl file.
   *
   * If parsed already, last parsed result return directly.
   * Constructs a new tokenizer if you want to parse again.
   */
  parse() {
    this.materials = new Map();
    this.activatingMaterial = null;

    for (;;) {
      const [type, eol, eof] = this.nextToken();
      if (eof) break;

      if (type === "#") {
        this.skipLine();
      } else {
        if (eol) throw new Error(`unexpected end of line in line ${this.line + 1}`);

        if (type === "newmtl") {
          this.parseNewMaterial();
        } else {
          this.verifyActivatingMaterial();

          if (type === "Ka" || type === "Ks" || type === "Kd") {
            this.parseColor(type);
          } else if (type === "Ns") {
            this.parseSpecularExponent();
          } else if (type === "Ni") {
            this.parseOpticalDensity();
          } else if (type === "d") {
            this.parseOpaque(false);
          } else if (type === "Tr") {
            this.parseOpaque(true);
          } else if (type === "illum") {
            this.parseIlluminationMode();
          } else {
            console.warn(`unsupported type '${type}' in line ${this.line + 1}`);
            this.skipLine();
          }
        }
      }
    }

    return this.materials;
  }

  /**
   * Parse new material, add it to instance and set as activating material.
   */
  parseNewMaterial() {
    let tokens = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      tokens.push(token);
      if (eol) break;
    }

    const materialName = tokens.join(" ");
    const material = new MTLPhongMaterial();
    this.materials.set(materialName, material);
    this.activatingMaterial = material;
  }

  /**
   * Ensure activating material is working
   * before assigning material properties.
   */
  verifyActivatingMaterial() {
    if (!this.activatingMaterial)
      throw new Error(
        `no material defined before assigning material properties in line ${this.line + 1}`
      );
  }

  /**
   * Parse rgb color and assign to specified material field by type.
   * @param {string} type
   */
  parseColor(type) {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number) || number < 0 || number > 1.0)
        throw new Error(`token ${token} in line ${this.line + 1} is not a color component`);
      numbers.push(number);

      if (eol) break;
    }

    switch (type) {
      case "Ka": {
        this.activatingMaterial.ambientColor = numbers;
        break;
      }
      case "Kd": {
        this.activatingMaterial.diffuseColor = numbers;
        break;
      }
      case "Ks": {
        this.activatingMaterial.specularColor = numbers;
        break;
      }
      default: {
        // never reach
      }
    }
  }

  /**
   * Parse Specular Shininess Exponent
   */
  parseSpecularExponent() {
    const [token] = this.nextToken();
    const number = parseFloat(token);
    if (isNaN(number) || number < 0 || number > 1000)
      throw new Error(`unexpected Specular Shininess Exponent in line ${this.line + 1}`);

    this.activatingMaterial.specularExponent = number;
  }

  /**
   * Parse opaque
   * @param {boolean} isTransparent is `Tr` type
   */
  parseOpaque(isTransparent) {
    const [token] = this.nextToken();
    const number = parseFloat(token);
    if (isNaN(number) || number < 0 || number > 1)
      throw new Error(`unexpected opaque in line ${this.line + 1}`);

    this.activatingMaterial.opaque = isTransparent ? 1 - number : number;
  }

  /**
   * Parse optical density
   */
  parseOpticalDensity() {
    const [token] = this.nextToken();
    const number = parseFloat(token);
    if (isNaN(number) || number < 0.001 || number > 10)
      throw new Error(`unexpected optical density in line ${this.line + 1}`);

    this.activatingMaterial.opticalDensity = number;
  }

  /**
   * Parse illumination mode
   */
  parseIlluminationMode() {
    const [token] = this.nextToken();
    const number = parseInt(token);
    if (isNaN(number) || number < 0 || number > 10)
      throw new Error(`unexpected illumination mode in line ${this.line + 1}`);

    this.activatingMaterial.illumination = number;
  }
}

class OBJReader {
  /**
   * @type {string}
   * @readonly
   */
  obj;
  /**
   * @type {string}
   * @readonly
   */
  mtls;
  /**
   * @type {Options}
   * @private
   */
  options;

  /**
   * Constructs a .obj file reader.
   * @param {string} obj .obj file in raw string
   * @param {Options} [options] fetch .mtl files parsed from .obj file
   */
  constructor(obj, options = {}) {
    this.obj = obj;
    this.options = options;
  }

  async parse() {
    return new OBJTokenizer(this.obj, this.options).parse();
  }
}

const instance = await fetch("/resources/cube.obj")
  .then((res) => res.text())
  .then((obj) =>
    new OBJReader(obj, {
      mtlsFromObj: true,
      mtlBaseUrl: "/resources",
    }).parse()
  );
const rotation = vec3.create();
instance.setRotation(rotation);
instance.updateModelMatrix();
// console.log(instance);

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);
const camera = new PerspectiveCamera(
  glMatrix.toRadian(30),
  gl.canvas.width / gl.canvas.height,
  1,
  5000,
  vec3.fromValues(0.0, 10.0, 4.0),
  vec3.fromValues(0.0, 0.0, 0.0)
);
const light = new PointLight(vec3.fromValues(1, 1, 1), 300, vec3.fromValues(0.0, 40.0, 4.0));

let lastRenderTime = 0;
const render = (renderTime) => {
  // update rotation
  const r = ((lastRenderTime / 1000) * 2) % 360;
  rotation[0] = r;
  rotation[2] = r;
  instance.setRotation(rotation);
  instance.updateModelMatrix();

  // render
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  instance.render(gl, camera, light);

  lastRenderTime = renderTime;
  requestAnimationFrame(render);
};
render(lastRenderTime);

getCanvasResizeObserver(() => {
  camera.setAspect(gl.canvas.width / gl.canvas.height, true);
  render(lastRenderTime);
});
