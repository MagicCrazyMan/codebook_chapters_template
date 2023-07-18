import {
  compileShader,
  createProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";
import { PerspectiveCamera } from "../../libs/camera/perspective";
import { glMatrix, mat4, vec3 } from "gl-matrix";
import { RenderGeometry } from "../../libs/geom/rendergeometry";

class OBJFace {
  /**
   * @type {number}
   * @readonly
   */
  vIndices;
  /**
   * @type {number}
   * @readonly
   */
  vnStart;
  /**
   * @type {number | false}
   * @readonly
   */
  vtStart;
  /**
   * @type {number}
   * @readonly
   */
  length;
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
   * @type {false | number}
   * @readonly
   */
  smoothing;

  constructor(
    vStart,
    vnStart,
    vtStart,
    length,
    material = null,
    objectName = null,
    groupNames = [],
    smoothing = false
  ) {
    this.vStart = vStart;
    this.vnStart = vnStart;
    this.vtStart = vtStart;
    this.length = length;
    this.material = material;
    this.objectName = objectName;
    this.groupNames = groupNames;
    this.smoothing = smoothing;
  }
}

class OBJInstance extends RenderGeometry {
  /**
  /**
   * Flatten geometric vertices values,
   * each vertex contains 4 components: x, y, z and w
   * @type {Float32Array}
   */
  geometricVertices = [];
  /**
   * Flatten texture vertices values,
   * each vertex contains 3 components: u, v and w
   * @type {Float32Array}
   */
  textureVertices = [];
  /**
   * Flatten normal vertices values,
   * each vertex contains 3 components: i, j and k
   * @type {Float32Array}
   */
  normalVertices = [];
  /**
   * Flatten parameter space vertices values,
   * each vertex contains 3 components: u, v and w
   * @type {Float32Array}
   */
  parameterVertices = [];
  /**
   * Length of geometric vertices
   * @type {number}
   */
  vLength;
  /**
   * Length of normal vertices
   * @type {number}
   */
  vnLength;
  /**
   * Length of texture vertices
   * @type {number}
   */
  vtLength;
  /**
   * Length of parameter spaces vertices
   * @type {number}
   */
  vpLength;
  /**
   * Map of all materials
   * @type {Map<string, MTLBasicMaterial>}
   */
  materials;
  /**
   * List of geometries.
   * @type {OBJFace[]}
   */
  geometries;

  constructor(
    geometricVertices,
    textureVertices,
    normalVertices,
    parameterVertices,
    vLength,
    vnLength,
    vtLength,
    vpLength,
    geometries,
    materials
  ) {
    super();
    this.geometricVertices = geometricVertices;
    this.textureVertices = textureVertices;
    this.normalVertices = normalVertices;
    this.parameterVertices = parameterVertices;
    this.vLength = vLength;
    this.vnLength = vnLength;
    this.vtLength = vtLength;
    this.vpLength = vpLength;
    this.materials = materials;
    this.geometries = geometries;
  }

  /**
   * @type {WebGLBuffer}
   * @private
   */
  _dataBuffer;

  /**
   * Gets data WebGL buffer
   * @public
   * @param {WebGL2RenderingContext} gl
   * @returns {WebGLBuffer}
   */
  getDataBuffer(gl) {
    if (!this._dataBuffer) {
      this._dataBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this._dataBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    return this._dataBuffer;
  }

  /**
   * @private
   */
  _tempMvpMatrix = mat4.create();
  /**
   *
   * @param {WebGL2RenderingContext} gl
   * @param {PerspectiveCamera} camera
   */
  render(gl, camera) {
    mat4.identity(this._tempMvpMatrix);
    mat4.multiply(this._tempMvpMatrix, this._tempMvpMatrix, camera.getViewProjMatrix());
    mat4.multiply(this._tempMvpMatrix, this._tempMvpMatrix, this.getModelMatrix());

    const state = {
      camera,
      instance: this,
      mvpMatrix: this._tempMvpMatrix,
    };
    this.geometries.forEach((geometry) => {
      const mtl = this.materials.get(geometry.material);
      if (!mtl) {
        console.warn(`missing material, some faces ignored`);
        return;
      }

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
}

class OBJTokenizer extends CommonTokenizer {
  /**
   * @typedef {Object} Options
   * @property {string[]} [mtls] prefetch .mtl files in raw string
   * @property {boolean} [mtlsFromObj] fetch .mtl files parsed from .obj file from remote.
   * @property {string} [mtlBaseUrl] base url when fetching .mtl files from remote.
   */

  /**
   * Flatten geometric vertices values,
   * each vertex contains 4 components: x, y, z and w
   * @type {number[]}
   */
  geometricVertices = [];
  /**
   * Flatten texture vertices values,
   * each vertex contains 3 components: u, v and w
   * @type {number[]}
   */
  textureVertices = [];
  /**
   * Flatten normal vertices values,
   * each vertex contains 3 components: i, j and k
   * @type {number[]}
   */
  normalVertices = [];
  /**
   * When a face geometry has no `vn` property,
   * parser will automatically calculate a normal
   * from face and push it into `normalVertices`.
   * This field tells parser how many normals had
   * calculated and add offset to normal indices
   */
  normalIndexOffset = 0;
  /**
   * Flatten normal vertices values,
   * each vertex contains 3 components: i, j and k
   * @type {number[]}
   */
  parameterVertices = [];
  /**
   * @type {string[]}
   * @private
   */
  materials;
  /**
   * List of geometries.
   * @type {OBJFace[]}
   */
  geometries = [];

  /**
   * @type {Options}
   * @private
   */
  options;

  /**
   * @type {string | null}
   * @private
   */
  activatingObjectName = null;
  /**
   * @type {string[]}
   * @private
   */
  activatingGroupNames = ["default"];
  /**
   * @type {string | null}
   * @private
   */
  activatingMaterial = null;
  /**
   * @type {boolean}
   * @private
   */
  activatingSmoothing = false;

  /**
   * @type {OBJInstance}
   */
  result = null;

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
    if (this.result) return this.result;

    for (;;) {
      const [tokenType, eol, eof] = this.nextToken();
      if (eof) break;

      if (tokenType === "#") {
        this.parseComment();
      } else {
        if (eol) throw new Error(`unexpected end of line in line ${this.line}`);

        if (tokenType === "v") {
          this.parseGeometricVertex();
        } else if (tokenType === "vt") {
          this.parseTextureVertex();
        } else if (tokenType === "vn") {
          this.parseNormalVertex();
        } else if (tokenType === "vp") {
          this.parseParameterVertex();
        } else if (tokenType === "p") {
          // this.parsePoint();
          throw new Error(`unimplemented point element`);
        } else if (tokenType === "l") {
          // this.parseLine();
          throw new Error(`unimplemented line element`);
        } else if (tokenType === "f") {
          this.parseFace();
        } else if (tokenType === "o") {
          this.parseObjectName();
        } else if (tokenType === "g") {
          this.parseGroupNames();
        } else if (tokenType === "s") {
          this.parseSmoothingGroup();
        } else if (tokenType === "mtllib") {
          await this.parseMaterialLibraries();
        } else if (tokenType === "usemtl") {
          this.parseUseMaterial();
        } else {
          throw new Error(`unsupported type '${tokenType}' in line ${this.line}`);
        }
      }
    }

    // parse mtls
    const parsedMaterials = new Map();
    this.materials.forEach((mtl) => {
      const materials = new MTLTokenizer(mtl).parse();
      materials.forEach((v, k) => {
        parsedMaterials.set(k, v);
      });
    });

    // transfer array to ArrayBuffer
    this.result = new OBJInstance(
      new Float32Array(this.geometricVertices),
      new Float32Array(this.normalVertices),
      new Float32Array(this.textureVertices),
      new Float32Array(this.parameterVertices),
      this.geometricVertices.length / 4,
      this.normalVertices.length / 3,
      this.textureVertices.length / 3,
      this.parameterVertices.length / 3,
      this.geometries,
      parsedMaterials
    );

    // drop data immediately
    this.geometricVertices.length = 0;
    this.normalVertices.length = 0;
    this.textureVertices.length = 0;
    this.parameterVertices.length = 0;

    return this.result;
  }

  /**
   * Parse token, skip every things after comment
   */
  parseComment() {
    for (;;) {
      const [_, eol] = this.nextToken();
      if (eol) break;
    }
  }

  /**
   * Parse geometric vertex
   */
  parseGeometricVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 3) {
      this.geometricVertices.push(...numbers, 1);
    } else if (numbers.length === 4) {
      this.geometricVertices.push(...numbers);
    } else if (numbers.length === 6) {
      this.geometricVertices.push(...numbers.slice(0, 3), 1);
      console.warn(`color values of geometric vertex ignored in line ${this.line}`);
    } else {
      throw new Error(`unexpected number size of geometric vertex in line ${this.line}`);
    }
  }

  /**
   * Parse texture vertex
   */
  parseTextureVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 1) {
      this.textureVertices.push(numbers[0], 0, 0);
    } else if (numbers.length === 2) {
      this.textureVertices.push(...numbers, 0);
    } else if (numbers.length === 3) {
      this.textureVertices.push(...numbers);
    } else {
      throw new Error(`unexpected number size of texture vertex in line ${this.line}`);
    }
  }

  /**
   * Parse normal vertex
   */
  parseNormalVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 3) {
      this.normalVertices.push(...numbers);
    } else {
      throw new Error(`unexpected number size of normal vertex in line ${this.line}`);
    }
  }

  /**
   * Parse parameter vertex
   */
  parseParameterVertex() {
    const numbers = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const number = parseFloat(token);
      if (isNaN(number)) throw new Error(`token ${token} in line ${this.line} is not a number`);
      numbers.push(number);

      if (eol) break;
    }

    if (numbers.length === 2) {
      this.parameterVertices.push(...numbers, 1);
    } else if (numbers.length === 3) {
      this.parameterVertices.push(...numbers);
    } else {
      throw new Error(`unexpected number size of parameter vertex in line ${this.line}`);
    }
  }

  /**
   * Parse material libraries
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
          fetch(`${this.options.mtlBaseUrl}/${mtl}`).then((res) => res.text())
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
   */
  parseObjectName() {
    let tokens = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      tokens.push(token);
      if (eol) break;
    }
    const objectName = tokens.join(" ");

    this.activatingObjectName = objectName;
    this.activatingGroupNames = ["default"];
  }

  /**
   * Parse group names, add to activating object and set groups as activating.
   * If no object activating, create a new default object with name `undefined`.
   */
  parseGroupNames() {
    const groupNames = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      groupNames.push(token);
      if (eol) break;
    }

    this.activatingGroupNames = groupNames;
  }

  /**
   * Parse use material and set as activating geometry.
   */
  parseUseMaterial() {
    let tokens = [];
    for (;;) {
      const [token, eol] = this.nextToken();
      tokens.push(token);
      if (eol) break;
    }

    this.activatingMaterial = tokens.join(" ");
  }

  /**
   * Parse smoothing group and set it to all activating groups.
   * If no groups activating, create and add into default group.
   */
  parseSmoothingGroup() {
    const [token, eol] = this.nextToken();
    if ((token && !eol) || (!token && eol))
      throw new Error(`unexpected smoothing group value in line ${this.line}`);

    let smoothing;
    if (smoothing === "off") {
      smoothing = false;
    } else {
      const num = parseInt(token);
      if (isNaN(num)) throw new Error(`unexpected smoothing group value in line ${this.line}`);
      smoothing = num === 0 ? false : num;
    }

    this.activatingSmoothing = smoothing;
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
  //       throw new Error(`token ${token} in line ${this.line} is not a geometric vertices index`);
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
  //       throw new Error(`unexpected geometric and texture index pair in line ${this.line}`);
  //     }

  //     // verify geometric index
  //     const geometricIndex = parseInt(v, 10);
  //     if (isNaN(geometricIndex))
  //       throw new Error(`token ${v} in line ${this.line} is not a geometric vertices index`);
  //     geometricIndices.push(geometricIndex);

  //     if (vt) {
  //       const textureIndex = parseInt(vt, 10);
  //       if (isNaN(textureIndex))
  //         throw new Error(`token ${vt} in line ${this.line} is not a texture vertices index`);

  //       textureIndices.push(textureIndex);
  //     }

  //     if (eol) break;
  //   }

  //   if (geometricIndices.length < 2) {
  //     throw new Error(`at least 2 vertices for a line geometry in line ${this.line}`);
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
   */
  parseFace() {
    let hasTextureIndices = false;
    let hasNormalIndices = false;
    let vIndices = [];
    let vtIndices = [];
    let vnIndices = [];
    for (let i = 0; ; i++) {
      const [token, eol] = this.nextToken();
      const [v, vt, vn] = token.split("/");

      if (i === 0) {
        hasTextureIndices = !!vt && vt.length !== 0;
        hasNormalIndices = !!vn && vn.length !== 0;
      }

      if (hasTextureIndices === (vt === void 0) || hasNormalIndices === (vn === void 0)) {
        throw new Error(`unexpected geometric, texture and normal index pair in line ${this.line}`);
      }

      // parse geometric index
      const geometricIndex = parseInt(v, 10);
      if (isNaN(geometricIndex))
        throw new Error(`token ${v} in line ${this.line} is not a geometric vertices index`);
      vIndices.push(geometricIndex);

      // parse texture index
      if (vt) {
        const textureIndex = parseInt(vt, 10);
        if (isNaN(textureIndex))
          throw new Error(`token ${vt} in line ${this.line} is not a texture vertices index`);
        vtIndices.push(textureIndex);
      }

      // parse normal index
      if (vn) {
        const normalIndex = parseInt(vn, 10);
        if (isNaN(normalIndex))
          throw new Error(`token ${vn} in line ${this.line} is not a normal vertices index`);
        vnIndices.push(normalIndex + this.normalIndexOffset);
      }

      if (eol) break;
    }

    if (vIndices.length < 3) {
      throw new Error(`face geometry requires at least 3 geometric vertices in line ${this.line}`);
    } else if (vIndices.length > 3) {
      // split into triangles, using triangle fan structure.
      // maybe replace earcut in the future
      const nvIndices = [];
      const nvtIndices = [];
      const nvnIndices = [];
      const tempVec0 = vec3.create();
      const tempVec1 = vec3.create();
      const tempVec2 = vec3.create();
      for (let i = 1; i <= vIndices.length - 2; i++) {
        const i0 = 0;
        const i1 = i;
        const i2 = i + 1;

        nvIndices.push(vIndices[i0], vIndices[i1], vIndices[i2]);

        if (hasTextureIndices) nvtIndices.push(vtIndices[i0], vtIndices[i1], vtIndices[i2]);

        if (hasNormalIndices) {
          nvnIndices.push(vnIndices[i0], vnIndices[i1], vnIndices[i2]);
        } else {
          // calculate normal from triangle
          const vIndex0 = vIndices[i0] - 1;
          const vIndex1 = vIndices[i1] - 1;
          const vIndex2 = vIndices[i2] - 1;
          let px0 = this.geometricVertices[vIndex0 * 4];
          let py0 = this.geometricVertices[vIndex0 * 4 + 1];
          let pz0 = this.geometricVertices[vIndex0 * 4 + 2];
          const pw0 = this.geometricVertices[vIndex0 * 4 + 3];
          let px1 = this.geometricVertices[vIndex1 * 4];
          let py1 = this.geometricVertices[vIndex1 * 4 + 1];
          let pz1 = this.geometricVertices[vIndex1 * 4 + 2];
          const pw1 = this.geometricVertices[vIndex1 * 4 + 3];
          let px2 = this.geometricVertices[vIndex2 * 4];
          let py2 = this.geometricVertices[vIndex2 * 4 + 1];
          let pz2 = this.geometricVertices[vIndex2 * 4 + 2];
          const pw2 = this.geometricVertices[vIndex2 * 4 + 3];

          px0 = px0 / pw0;
          py0 = py0 / pw0;
          pz0 = pz0 / pw0;
          px1 = px1 / pw1;
          py1 = py1 / pw1;
          pz1 = pz1 / pw1;
          px2 = px2 / pw2;
          py2 = py2 / pw2;
          pz2 = pz2 / pw2;

          vec3.set(tempVec0, px1 - px0, py1 - py0, pz1 - pz0);
          vec3.set(tempVec1, px2 - px1, py2 - py1, pz2 - pz1);
          vec3.cross(tempVec2, tempVec0, tempVec1);
          vec3.normalize(tempVec2, tempVec2);

          const index = this.normalVertices.length / 3 + 1;
          this.normalVertices.push(tempVec2[0], tempVec2[1], tempVec2[2]);
          this.normalIndexOffset++;
          nvnIndices.push(index, index, index);
        }
      }

      vIndices = nvIndices;
      vnIndices = nvnIndices;
      vtIndices = nvtIndices;
    }

    const start = this.indices.length;
    this.indices.push(...vIndices);
    this.indices.push(...vnIndices);
    this.indices.push(...vtIndices);
    const face = new OBJFace(
      start,
      vIndices.length,
      vnIndices.length,
      vtIndices.length,
      this.activatingMaterial,
      this.activatingObjectName,
      this.activatingGroupNames,
      this.activatingSmoothing
    );
    this.geometries.push(face);
  }
}

class MTLBasicMaterial {
  /**
   * @private
   */
  static VERTEX_SHADER_SOURCE = `
    attribute vec4 a_Position;
    
    uniform vec4 u_Color;
    uniform mat4 u_MvpMatrix;

    varying vec4 v_Color;

    void main() {
      gl_Position = u_MvpMatrix * a_Position;
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

    uniform vec3 u_AmbientLightColor;

    varying vec4 v_Color;

    void main() {
      gl_FragColor = vec4(v_Color.rgb, v_Color.a);
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
    if (MTLBasicMaterial.program) return MTLBasicMaterial.program;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, MTLBasicMaterial.VERTEX_SHADER_SOURCE);
    const fragmentShader = compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      MTLBasicMaterial.FRAGMENT_SHADER_SOURCE
    );
    const program = createProgram(gl, [vertexShader, fragmentShader]);

    MTLBasicMaterial.program = program;
    MTLBasicMaterial.attributeLocations = {
      a_Position: gl.getAttribLocation(program, "a_Position"),
    };
    MTLBasicMaterial.uniformLocations = {
      u_Color: gl.getUniformLocation(program, "u_Color"),
      u_AmbientLightColor: gl.getUniformLocation(program, "u_AmbientLightColor"),
      u_MvpMatrix: gl.getUniformLocation(program, "u_MvpMatrix"),
    };

    return MTLBasicMaterial.program;
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

  /**
   * @typedef {Object} RenderState
   * @property {PerspectiveCamera} camera
   * @property {OBJInstance} instance
   * @property {mat4} mvpMatrix
   */

  /**
   *
   * @param {WebGL2RenderingContext} gl
   * @param {OBJFace} geometry
   * @param {RenderState} state
   */
  render(gl, geometry, state) {
    debugger;
    gl.useProgram(MTLBasicMaterial.getProgram(gl));

    // bind mvp matrix
    gl.uniformMatrix4fv(MTLBasicMaterial.uniformLocations["u_MvpMatrix"], false, state.mvpMatrix);
    // bind color
    gl.uniform4f(
      MTLBasicMaterial.uniformLocations["u_Color"],
      this.diffuseColor[0],
      this.diffuseColor[1],
      this.diffuseColor[2],
      this.opaque
    );
    // bind ambient color
    gl.uniform3fv(MTLBasicMaterial.uniformLocations["u_AmbientLightColor"], this.ambientColor);

    // bind data buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, state.instance.getDataBuffer(gl));
    gl.vertexAttribPointer(
      MTLBasicMaterial.attributeLocations["a_Position"],
      4,
      gl.FLOAT,
      false,
      0,
      0
    );
    gl.enableVertexAttribArray(MTLBasicMaterial.attributeLocations["a_Position"]);

    // bind indices buffer
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.instance.getIndicesBuffer(gl));

    // draw
    gl.drawElements(gl.TRIANGLES, geometry.length, gl.UNSIGNED_INT, geometry.vStart);
  }
}

class MTLTokenizer extends CommonTokenizer {
  /**
   * @type {Map<string, MTLBasicMaterial>}
   * @private
   */
  materials = null;

  /**
   * @type {MTLBasicMaterial | null}
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
    if (this.materials) return this.materials;

    this.materials = new Map();
    for (;;) {
      const [tokenType, eol, eof] = this.nextToken();
      if (eof) break;

      if (tokenType === "#") {
        this.parseComment();
      } else {
        if (eol) throw new Error(`unexpected end of line in line ${this.line + 1}`);

        if (tokenType === "newmtl") {
          this.parseNewMaterial();
        } else {
          this.verifyActivatingMaterial();

          if (tokenType === "Ka" || tokenType === "Ks" || tokenType === "Kd") {
            this.parseColor(tokenType);
          } else if (tokenType === "Ns") {
            this.parseSpecularExponent();
          } else if (tokenType === "Ni") {
            this.parseOpticalDensity();
          } else if (tokenType === "d") {
            this.parseOpaque(false);
          } else if (tokenType === "Tr") {
            this.parseOpaque(true);
          } else if (tokenType === "illum") {
            this.parseIlluminationMode();
          }
        }
      }
    }

    return this.materials;
  }

  /**
   * Parse token, skip every things after comment
   */
  parseComment() {
    for (;;) {
      const [_, eol] = this.nextToken();
      if (eol) break;
    }
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
    const material = new MTLBasicMaterial();
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
        `no material defined before assigning material properties in line ${this.line}`
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
        throw new Error(`token ${token} in line ${this.line} is not a color component`);
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
   * Parse specular exponent
   */
  parseSpecularExponent() {
    const [token] = this.nextToken();
    const number = parseFloat(token);
    if (isNaN(number) || number < 0 || number > 1000)
      throw new Error(`unexpected specular exponent in line ${this.line}`);

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
      throw new Error(`unexpected opaque in line ${this.line}`);

    this.activatingMaterial.opaque = isTransparent ? 1 - number : number;
  }

  /**
   * Parse optical density
   */
  parseOpticalDensity() {
    const [token] = this.nextToken();
    const number = parseFloat(token);
    if (isNaN(number) || number < 0.001 || number > 10)
      throw new Error(`unexpected optical density in line ${this.line}`);

    this.activatingMaterial.opticalDensity = number;
  }

  /**
   * Parse illumination mode
   */
  parseIlluminationMode() {
    const [token] = this.nextToken();
    const number = parseInt(token);
    if (isNaN(number) || number < 0 || number > 10)
      throw new Error(`unexpected illumination mode in line ${this.line}`);

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
console.log(instance);

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);
const camera = new PerspectiveCamera(
  vec3.fromValues(0.0, 500.0, 200.0),
  vec3.fromValues(0.0, 0.0, 0.0),
  glMatrix.toRadian(30),
  gl.canvas.width / gl.canvas.height,
  1,
  5000
);
const render = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  instance.render(gl, camera);
};
render();

getCanvasResizeObserver(() => {
  camera.setAspect(gl.canvas.width / gl.canvas.height);
  camera.updateViewMatrix();
  render();
});
