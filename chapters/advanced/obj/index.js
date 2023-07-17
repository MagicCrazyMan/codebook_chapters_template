import { getCanvasResizeObserver } from "../../libs/common";

class OBJGeometricVertex {
  /**@type {number[]} */
  xyzw;
  /**@type {number[] | null} */
  rgb;

  /**
   *
   * @param {number[]} xyzw
   * @param {number[] | null} [rgb]
   */
  constructor(xyzw, rgb = null) {
    this.vertex = xyzw;
    this.rgb = rgb;
  }

  x() {
    return this.xyzw[0];
  }

  y() {
    return this.xyzw[1];
  }

  z() {
    return this.xyzw[2];
  }

  w() {
    return this.xyzw[3] ?? 1;
  }

  vertex() {
    const vertex = [...this.xyzw];
    vertex[3] ??= 1;
    return vertex;
  }

  r() {
    return this.rgb?.[0] ?? null;
  }

  g() {
    return this.rgb?.[1] ?? null;
  }

  b() {
    return this.rgb?.[2] ?? null;
  }

  color() {
    if (this.rgb) {
      return [...this.rgb];
    } else {
      return null;
    }
  }
}

class OBJTextureVertex {
  /**@type {number[]} */
  uvw;

  /**
   *
   * @param {number[]} uvw
   */
  constructor(uvw) {
    this.uvw = uvw;
  }

  u() {
    return this.uvw[0];
  }

  v() {
    return this.uvw[1] ?? 0;
  }

  w() {
    return this.uvw[2] ?? 0;
  }

  vertex() {
    const vertex = [...this.uvw];
    vertex[1] ??= 0;
    vertex[2] ??= 0;
    return vertex;
  }
}

class OBJNormalVertex {
  /**@type {number[]} */
  ijk;

  /**
   *
   * @param {number[]} ijk
   */
  constructor(ijk) {
    this.ijk = ijk;
  }

  i() {
    return this.ijk[0];
  }

  j() {
    return this.ijk[1];
  }

  k() {
    return this.ijk[2];
  }

  vertex() {
    return [...this.ijk];
  }
}

class OBJParameterVertex {
  /**@type {number[]} */
  uvw;

  /**
   *
   * @param {number[]} uvw
   */
  constructor(uvw) {
    this.uvw = uvw;
  }

  u() {
    return this.uvw[0];
  }

  v() {
    return this.uvw[1];
  }

  w() {
    return this.uvw[2] ?? 0;
  }

  vertex() {
    const vertex = [...this.uvw];
    vertex[2] ??= 1;
    return vertex;
  }
}

class OBJObject {
  /**@type {Map<string, OBJGroup>} */
  groups = new Map();
}

class OBJGroup {
  /**@type {false | number} */
  smoothing = false;
  /**@type {OBJGeometry[]} */
  geometries = [];
}

/**@enum {number} */
const OBJGeometryType = {
  Point: 0,
  Line: 1,
  Face: 2,
};
class OBJGeometry {
  /**@type {OBJGeometryType} */
  type;
  /**@type {string | null} */
  material = null;

  /**@type {number[][]} */
  geometricIndices = [];
  /**@type {number[][] | null} */
  textureIndices = null;
  /**@type {number[][] | null} */
  normalIndices = null;

  /**
   *
   * @param {OBJGeometryType} type
   */
  constructor(type) {
    this.type = type;
  }
}

class OBJNormalIndex {
  /**
   * @type {0 | 1} index source
   */
  source;
  /**
   * @type {number} index
   */
  index;

  /**
   *
   * @param {0 | 1} source index source
   * @param {number} index index number
   */
  constructor(source, index) {
    this.source = source;
    this.index = index;
  }
}

class OBJFace {
  /**
   * @type {number[]}
   */
  geometricIndices = [];
  /**
   * @type {OBJNormalIndex[]}
   */
  normalIndices = [];
  /**
   * @type {number[] | null}
   */
  textureIndices = null;
}

class OBJInstance {
  /**
   * List of all geometric vertices
   * @type {OBJGeometricVertex[]}
   */
  geometricVertices = [];
  /**
   * List of all texture vertices
   * @type {OBJTextureVertex[]}
   */
  textureVertices = [];
  /**
   * List of all normal vertices
   * @type {OBJNormalVertex[]}
   */
  normalVertices = [];
  /**
   * List of all normal vertices that calculated from  vertices
   * @type {OBJNormalVertex[]}
   */
  calculatedNormalVertices = [];
  /**
   * List of all parameter space vertices
   * @type {OBJParameterVertex[]}
   */
  parameterVertices = [];
  /**
   * Map of all materials
   * @type {Map<string, MTLMaterial>}
   */
  mtls = new Map();
  /**
   * Tree view of grouped objects.
   *
   * DO NOT render objects using this field.
   * Geometries may duplicated if
   * `.obj` file defines multiple group name in one `g` statement
   * or reuse group name in different `g` statement.
   * @type {Map<string, OBJObject>}
   */
  objects = new Map();
  /**
   * Standalone grouped objects of the whole file.
   *
   * Render objects using this field.
   * All objects in this field never duplicated.
   * @type {OBJGroup[]}
   */
  groups = [];
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
   * @type {string[]}
   * @private
   */
  mtls;
  /**
   * @type {Options}
   * @private
   */
  options;

  /**
   * @type {OBJInstance | null}
   * @private
   */
  instance = null;
  /**
   * @type {OBJObject | null}
   * @private
   */
  activatingObject = null;
  /**
   * @type {Set<OBJGroup> | null}
   * @private
   */
  activatingGroups = null;
  /**
   * @type {string | null}
   * @private
   */
  activatingMaterial = null;

  /**
   * Constructs a .obj string tokenizer.
   * @param {string} obj .obj file in raw string
   * @param {Options} options options
   */
  constructor(obj, options = {}) {
    super(obj, " ");
    this.mtls = options.mtls ?? [];
    this.options = options;
  }

  /**
   * Parses .obj file.
   *
   * If parsed already, last parsed result return directly.
   * Constructs a new tokenizer if you want to parse again.
   */
  async parse() {
    if (this.instance) return this.instance;

    this.instance = new OBJInstance();
    for (;;) {
      const [tokenType, eol, eof] = this.nextToken();
      if (eof) break;

      if (tokenType === "#") {
        this.parseComment();
      } else {
        if (eol) throw new Error(`unexpected end of line in line ${this.line + 1}`);

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
          throw new Error(`unsupported type '${tokenType}' in line ${this.line + 1}`);
        }
      }
    }

    // parse mtls
    this.mtls.forEach((mtl) => {
      const materials = new MTLTokenizer(mtl).parse();
      materials.forEach((v, k) => {
        this.instance.mtls.set(k, v);
      });
    });

    return this.instance;
  }

  getActivatingObject() {
    if (this.activatingObject) {
      return this.activatingObject;
    } else {
      const defaultObject = new OBJObject();
      this.activatingObject = defaultObject;
      this.instance.objects.set(undefined, this.activatingObject);
      return defaultObject;
    }
  }

  getActivatingGroups() {
    if (this.activatingGroups) {
      return this.activatingGroups;
    } else {
      const activatingObject = this.getActivatingObject();
      let defaultGroup = activatingObject.groups.get("default");
      if (!defaultGroup) {
        defaultGroup = new OBJGroup();
        this.instance.groups.push(defaultGroup);
        activatingObject.groups.set("default", defaultGroup);
      }

      this.activatingGroups = new Set([defaultGroup]);
      return this.activatingGroups;
    }
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

    let geometricVertex;
    if (numbers.length === 3 || numbers.length === 4) {
      geometricVertex = new OBJGeometricVertex(numbers);
    } else if (numbers.length === 6) {
      geometricVertex = new OBJGeometricVertex(
        [numbers[0], numbers[1], numbers[2]],
        [numbers[3], numbers[4], numbers[5]]
      );
    } else {
      throw new Error(`unexpected number size of geometric vertex in line ${this.line}`);
    }

    this.instance.geometricVertices.push(geometricVertex);
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

    if (numbers.length >= 1 && numbers.length <= 3) {
      this.instance.textureVertices.push(new OBJTextureVertex(numbers));
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
      this.instance.normalVertices.push(new OBJNormalVertex(numbers));
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

    if (numbers.length === 2 || numbers.length === 3) {
      this.instance.parameterVertices.push(new OBJParameterVertex(numbers));
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
      const requests = mtls.map((mtl) =>
        fetch(`${this.options.mtlBaseUrl}/${mtl}`).then((res) => res.text())
      );
      this.mtls.push(...(await Promise.all(requests)));
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

    const activatingObject = new OBJObject();
    this.activatingObject = activatingObject;
    this.activatingGroups = null;
    this.instance.objects.set(objectName, activatingObject);
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

    const activatingGroups = new Set();
    const obj = this.getActivatingObject();
    groupNames.forEach((name) => {
      let group = obj.groups.get(name);
      if (!group) {
        group = new OBJGroup();
        this.instance.groups.push(group);
        obj.groups.set(name, group);
      }
      activatingGroups.add(group);
    });
    this.activatingGroups = activatingGroups;
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
    this.getActivatingGroups().forEach((group) => {
      group.smoothing = smoothing;
    });
  }

  /**
   * Parse point and add into all activating groups.
   * If no groups activating, create and add into default group.
   */
  parsePoint() {
    const indices = [];
    for (;;) {
      const [token, eol] = this.nextToken();

      const index = parseInt(token, 10);
      if (isNaN(index))
        throw new Error(`token ${token} in line ${this.line} is not a geometric vertices index`);
      indices.push(index);

      if (eol) break;
    }

    const geometry = new OBJGeometry(OBJGeometryType.Point);
    geometry.geometricIndices = indices;
    geometry.material = this.activatingMaterial;
    this.getActivatingGroups().forEach((group) => {
      group.geometries.push(geometry);
    });
  }

  /**
   * Parse line and add into all activating groups.
   * If no groups activating, create and add into default group.
   */
  parseLine() {
    let hasTextureIndices = false;
    const geometricIndices = [];
    const textureIndices = [];
    for (let i = 0; ; i++) {
      const [token, eol] = this.nextToken();
      const [v, vt] = token.split("/");

      if (i === 0) {
        hasTextureIndices = vt && vt.length !== 0;
      }

      // verify texture index
      if (hasTextureIndices === (vt === void 0)) {
        throw new Error(`unexpected geometric and texture index pair in line ${this.line}`);
      }

      // verify geometric index
      const geometricIndex = parseInt(v, 10);
      if (isNaN(geometricIndex))
        throw new Error(`token ${v} in line ${this.line} is not a geometric vertices index`);
      geometricIndices.push(geometricIndex);

      if (vt) {
        const textureIndex = parseInt(vt, 10);
        if (isNaN(textureIndex))
          throw new Error(`token ${vt} in line ${this.line} is not a texture vertices index`);

        textureIndices.push(textureIndex);
      }

      if (eol) break;
    }

    if (geometricIndices.length < 2) {
      throw new Error(`at least 2 vertices for a line geometry in line ${this.line}`);
    }

    const geometry = new OBJGeometry(OBJGeometryType.Line);
    geometry.geometricIndices = geometricIndices;
    geometry.textureIndices = textureIndices.length === 0 ? null : textureIndices;
    geometry.material = this.activatingMaterial;
    this.getActivatingGroups().forEach((group) => {
      group.geometries.push(geometry);
    });
  }

  /**
   * Parse face and add into all activating groups.
   * If no groups activating, create and add into default group.
   */
  parseFace() {
    let hasTextureIndices = false;
    let hasNormalIndices = false;
    const geometricIndices = [];
    const textureIndices = [];
    const normalIndices = [];
    for (let i = 0; ; i++) {
      const [token, eol] = this.nextToken();
      const [v, vt, vn] = token.split("/");

      if (i === 0) {
        hasTextureIndices = vt && vt.length !== 0;
        hasNormalIndices = vn && vn.length !== 0;
      }

      if (hasTextureIndices === (vt === void 0) || hasNormalIndices === (vn === void 0)) {
        throw new Error(`unexpected geometric, texture and normal index pair in line ${this.line}`);
      }

      // verify geometric index
      const geometricIndex = parseInt(v, 10);
      if (isNaN(geometricIndex))
        throw new Error(`token ${v} in line ${this.line} is not a geometric vertices index`);
      geometricIndices.push(geometricIndex);

      // verify texture index
      if (vt) {
        const textureIndex = parseInt(vt, 10);
        if (isNaN(textureIndex))
          throw new Error(`token ${vt} in line ${this.line} is not a texture vertices index`);

        textureIndices.push(textureIndex);
      }

      // verify normal index
      if (vn) {
        const normalIndex = parseInt(vn, 10);
        if (isNaN(normalIndex))
          throw new Error(`token ${vn} in line ${this.line} is not a normal vertices index`);

        normalIndices.push(normalIndex);
      }

      if (eol) break;
    }

    if (geometricIndices.length < 3) {
      throw new Error(`at least 3 vertices for a face geometry in line ${this.line}`);
    } else if (geometricIndices.length > 3) {
      throw new Error(`only triangular face geometry supported in line ${this.line}`);
    }

    const geometry = new OBJGeometry(OBJGeometryType.Face);
    geometry.geometricIndices = geometricIndices;
    geometry.textureIndices = textureIndices.length === 0 ? null : textureIndices;
    geometry.normalIndices = normalIndices.length === 0 ? null : normalIndices;
    geometry.material = this.activatingMaterial;
    this.getActivatingGroups().forEach((group) => {
      group.geometries.push(geometry);
    });
  }
}

class MTLColor {
  /**
   * @type {number[]}
   * @private
   */
  rgb;

  /**
   *
   * @param {number[]} rgb
   */
  constructor(rgb) {
    this.rgb = rgb;
  }

  r() {
    return this.rgb[0];
  }

  g() {
    return this.rgb[1];
  }

  b() {
    return this.rgb[2];
  }

  color() {
    return [...this.rgb];
  }
}

class MTLMaterial {
  /**
   * @type {MTLColor}
   */
  ambientColor;
  /**
   * @type {MTLColor}
   */
  diffuseColor;
  /**
   * @type {MTLColor}
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
}

class MTLTokenizer extends CommonTokenizer {
  /**
   * @type {Map<string, MTLMaterial>}
   * @private
   */
  materials = null;

  /**
   * @type {MTLMaterial | null}
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
    const material = new MTLMaterial();
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

    const color = new MTLColor(numbers);
    switch (type) {
      case "Ka": {
        this.activatingMaterial.ambientColor = color;
        break;
      }
      case "Kd": {
        this.activatingMaterial.diffuseColor = color;
        break;
      }
      case "Ks": {
        this.activatingMaterial.specularColor = color;
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

const render = () => {};

render();
getCanvasResizeObserver(render);
