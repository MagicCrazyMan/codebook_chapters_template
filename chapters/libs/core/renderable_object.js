/* eslint-disable @typescript-eslint/no-unused-vars */
import { TransformObject } from "./transform_object.js";

/**
 * Buffer usages, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferUsage = {
  StaticDraw: 0,
  DynamicDraw: 1,
  StreamDraw: 2,
  StaticRead: 3,
  DynamicRead: 4,
  StreamRead: 5,
  StaticCopy: 6,
  DynamicCopy: 7,
  StreamCopy: 8,
};

/**
 * Buffer targets, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferTarget = {
  ArrayBuffer: 0,
  ElementArrayBuffer: 1,
  CopyReadBuffer: 2,
  CopyWriteBuffer: 3,
  TransformFeedbackBuffer: 4,
  UniformBUffer: 5,
  PixelPackBuffer: 6,
  PixelUnpackBuffer: 7,
};

/**
 * @typedef {Object} Buffer
 * @property {BufferSource} arraybuffer ArrayBuffer ready for buffering into WebGL
 * @property {BufferTarget} target WebGL buffer target
 * @property {BufferUsage} usage WebGL buffer usage
 * @property {boolean} buffered Is buffer buffered
 */

/**
 * @typedef {Object} ReuseBuffer
 * @property {WebGLBuffer} buffer Reuse WebGL buffer
 * @property {BufferTarget} target WebGL buffer target
 */

/**
 * @typedef {Object} BufferState
 * @property {WebGLBuffer} buffer WebGL buffer
 * @property {GLenum} target WebGL buffer target
 * @property {boolean} reuse Is reuse WebGL buffer
 */

/**
 * Attribute types, mapping to WebGL enums.
 * @enum {number}
 */
export const AttributeTypes = {
  Buffer: 0,
  FloatVector1: 2,
  FloatVector2: 3,
  FloatVector3: 4,
  FloatVector4: 5,
  IntVector4: 6,
  UnsignedIntVector4: 7,
};

/**
 * Buffer attribute data types, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferAttributeDataType = {
  Byte: 0,
  Short: 2,
  UnsignedByte: 3,
  UnsignedShort: 4,
  Float: 5,
  HalfFloat: 6,
  Int: 7,
  UnsignedInt: 8,
  Int_2_10_10_10_Rev: 9,
  UnsignedInt_2_10_10_10_Rev: 10,
};

/**
 * @typedef {Object} BufferAttribute Attribute from WebGL buffer
 * @property {AttributeTypes} type Attribute type
 * @property {string} bufferName Buffer name that this attribute used
 * @property {BufferAttributeDataType} dataType Attribute data type
 * @property {number} size Attribute size
 * @property {boolean} normalized Is data normalized
 * @property {number} stride Attribute stride
 * @property {number} offset Attribute offset
 */

/**
 * @typedef {Object} ArrayAttribute Attribute from array
 * @property {AttributeTypes} type Attribute type
 * @property {Iterable<GLfloat | GLint>} data Attribute data
 */

/**
 * Uniform types, mapping to WebGL enums.
 * @enum {number}
 */
export const UniformTypes = {
  FloatVector1: 0,
  IntVector1: 1,
  FloatVector2: 2,
  IntVector2: 3,
  FloatVector3: 4,
  IntVector3: 5,
  FloatVector4: 6,
  IntVector4: 7,
  Mat2: 8,
  Mat3: 9,
  Mat4: 10,
};

/**
 * @typedef {Object} Uniform Uniform data
 * @property {UniformTypes} type Uniform type
 * @property {Iterable<GLfloat | GLint>} data Uniform data
 * @property {GLboolean} [transpose] Uniform matrix transpose, default `false`
 * @property {GLboolean} [srcOffset] Uniform matrix offset, default `undefined`
 * @property {GLboolean} [srcLength] Uniform matrix offset, default `undefined`
 */

/**
 * @typedef {Object} Options Renderable object options
 * @property {string} [name] Object name
 * @property {number} [verticesCount] Vertices count
 * @property {number} [verticesOffset] Vertices offset
 * @property {import("../material/material.js").Material} [material] Material
 * @property {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
 * @property {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
 * @property {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scale
 */

/**
 * Draw types, mapping to WebGL enums.
 * @enum {number}
 */
export const DrawType = {
  Points: 0,
  Lines: 1,
  LineStrip: 2,
  LineLoop: 3,
  Triangles: 4,
  TrianglesFan: 5,
  TrianglesStrip: 6,
};

/**
 * Abstract renderable object.
 * @abstract
 */
export class RenderableObject extends TransformObject {
  static BasicAttributeVariableNames = {
    Position: "a_Position",
    Normal: "a_Normal",
    TexCoord: "a_TexCoord",
  };

  static BasicUniformVariableNames = {
    ModelMatrix: "u_ModelMatrix",
    NormalMatrix: "u_NormalMatrix",
    MvpMatrix: "u_MvpMatrix",
  };

  /**
   * @type {Uint32Array | Uint16Array | Uint8Array | undefined}
   * @private
   */
  _indicesBuffer;

  /**
   * @type {WebGLBuffer | undefined}
   * @readonly
   */
  glIndicesBuffer;

  /**
   * @type {GLenum | undefined}
   * @readonly
   */
  indicesType;

  /**
   * @type {Map<string, Buffer | ReuseBuffer>}
   * @private
   */
  _bufferPools = new Map();

  /**
   *
   * @type {Map<string, BufferState>}
   * @readonly
   */
  buffers = new Map();

  /**
   * Attributes
   * @type {Map<string, ArrayAttribute | BufferAttribute>}
   * @readonly
   */
  attributes = new Map();

  /**
   * Uniforms
   * @type {Map<string, Uniform>}
   * @readonly
   */
  uniforms = new Map();

  /**
   * If this object destroyed
   * @type {boolean}
   * @readonly
   */
  destroyed = false;

  /**
   * Whether this is a indexed object
   * @readonly
   */
  get isIndexed() {
    return !!this._indicesBuffer;
  }

  /**
   * Draw types
   * @type {DrawType}
   * @readonly
   */
  drawType;

  /**
   * Vertices count
   * @type {number}
   * @readonly
   */
  verticesCount;

  /**
   * Vertex offset
   * @type {number}
   * @readonly
   */
  verticesOffset;

  /**
   * Material
   * @type {import("../material/material.js").Material | undefined}
   * @readonly
   */
  material;

  /**
   * Constructs a new renderable object.
   * @param {DrawType} drawType Options
   * @param {Options} [opts] Options
   */
  constructor(drawType, opts = {}) {
    super(opts.translation, opts.rotation, opts.scaling);
    this.drawType = drawType;
    this.verticesCount = opts.verticesCount ?? 0;
    this.verticesOffset = opts.verticesOffset ?? 0;
    this.material = opts.material;

    this.setUniform(RenderableObject.BasicUniformVariableNames.MvpMatrix, {
      type: UniformTypes.Mat4,
      data: this.mvpMatrix,
    });
    this.setUniform(RenderableObject.BasicUniformVariableNames.ModelMatrix, {
      type: UniformTypes.Mat4,
      data: this.composedModelMatrix,
    });
    this.setUniform(RenderableObject.BasicUniformVariableNames.NormalMatrix, {
      type: UniformTypes.Mat4,
      data: this.composeNormalMatrix,
    });
  }

  /**
   * Buffer indices data
   * @private
   * @param {WebGL2RenderingContext} gl
   */
  initIndices(gl) {
    if (!this._indicesBuffer) {
      if (this.glIndicesBuffer) gl.deleteBuffer(this.glIndicesBuffer);
      return;
    }
    if (this._indicesBuffer.buffered) return;

    if (!this.glIndicesBuffer) {
      this.glIndicesBuffer = gl.createBuffer();
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.glIndicesBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      this._indicesBuffer.arraybuffer,
      this.isConstant ? gl.STATIC_DRAW : gl.DYNAMIC_DRAW
    );
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    if (this._indicesBuffer.arraybuffer instanceof Uint8Array) {
      this.indicesType = gl.UNSIGNED_BYTE;
    } else if (this._indicesBuffer.arraybuffer instanceof Uint16Array) {
      this.indicesType = gl.UNSIGNED_SHORT;
    } else if (this._indicesBuffer.arraybuffer instanceof Uint32Array) {
      this.indicesType = gl.UNSIGNED_INT;
    }
  }

  /**
   * @private
   * @param {WebGL2RenderingContext} gl
   */
  initBuffer(gl) {
    // removes all buffers removed from buffer pools
    Array.from(this.buffers.keys()).forEach((name) => {
      if (this._bufferPools.has(name)) return;

      const buffer = this.buffers.get(name);
      // do not delete reuse buffer
      if (!buffer.reuse) gl.deleteBuffer(buffer.buffer);
      this.buffers.delete(name);
    });

    // load buffers
    this._bufferPools.forEach((value, name) => {
      const isReuseBuffer = value.buffer instanceof WebGLBuffer;

      let target;
      switch (value.target) {
        case BufferTarget.ArrayBuffer:
          target = gl.ARRAY_BUFFER;
          break;
        case BufferTarget.CopyReadBuffer:
          target = gl.COPY_READ_BUFFER;
          break;
        case BufferTarget.CopyWriteBuffer:
          target = gl.COPY_WRITE_BUFFER;
          break;
        case BufferTarget.ElementArrayBuffer:
          target = gl.ELEMENT_ARRAY_BUFFER;
          break;
        case BufferTarget.PixelPackBuffer:
          target = gl.PIXEL_PACK_BUFFER;
          break;
        case BufferTarget.PixelUnpackBuffer:
          target = gl.PIXEL_PACK_BUFFER;
          break;
        case BufferTarget.TransformFeedbackBuffer:
          target = gl.TRANSFORM_FEEDBACK_BUFFER;
          break;
        case BufferTarget.UniformBUffer:
          target = gl.UNIFORM_BUFFER;
          break;
      }

      if (isReuseBuffer) {
        this.buffers.set(name, {
          buffer: value.buffer,
          target,
          reuse: true,
        });
      } else {
        if (value.buffered) return;

        let usage;
        switch (value.usage) {
          case BufferUsage.DynamicCopy:
            usage = gl.DYNAMIC_COPY;
            break;
          case BufferUsage.DynamicDraw:
            usage = gl.DYNAMIC_DRAW;
            break;
          case BufferUsage.DynamicRead:
            usage = gl.DYNAMIC_READ;
            break;
          case BufferUsage.StaticCopy:
            usage = gl.STATIC_COPY;
            break;
          case BufferUsage.StaticDraw:
            usage = gl.STATIC_DRAW;
            break;
          case BufferUsage.StaticRead:
            usage = gl.STATIC_READ;
            break;
          case BufferUsage.StreamCopy:
            usage = gl.STREAM_COPY;
            break;
          case BufferUsage.StreamDraw:
            usage = gl.STREAM_DRAW;
            break;
          case BufferUsage.StreamRead:
            usage = gl.STREAM_READ;
            break;
        }

        const buffer = gl.createBuffer();
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, value.arraybuffer, usage);
        gl.bindBuffer(target, null);
        this.buffers.set(name, {
          buffer,
          target,
          reuse: false,
        });
        value.buffered = true;
      }
    });
  }

  /**
   * Initialize WebGL for rendering
   * @public
   * @param {WebGL2RenderingContext} gl
   */
  glInit(gl) {
    this.testDestroyed();

    this.initIndices(gl);
    this.initBuffer(gl);
  }

  /**
   * Sets indices.
   * @public
   * @param {Uint32Array | Uint16Array | Uint8Array} [arraybuffer] indices data
   */
  setIndices(arraybuffer) {
    this.testDestroyed();

    this._indicesBuffer = {
      arraybuffer,
      buffered: false,
      offset: 0,
    };
  }

  /**
   * Removes indices
   */
  removeIndices() {
    this.testDestroyed();
    this._indicesBuffer = undefined;
  }

  /**
   * Sets buffer for this object.
   *
   * Developer could reuse existing WebGL buffer.
   * @param {string} name Buffer name
   * @param {Buffer | ReuseBuffer} buffer Buffer data
   */
  setBuffer(name, buffer) {
    this.testDestroyed();
    this._bufferPools.set(name, buffer);
  }

  /**
   * Removes buffer for this object.
   * @param {string} name Buffer name
   */
  removeBuffer(name) {
    this.testDestroyed();
    this._bufferPools.delete(name);
  }

  /**
   * Sets buffer attribute
   * @param {string} name Attribute variable name
   * @param {string} bufferName Buffer name that this attribute used
   * @param {number} size Attribute size
   * @param {BufferAttributeDataType} dataType Attribute data type
   * @param {boolean} normalized Attribute normalized
   * @param {number} stride Attribute stride
   * @param {number} offset Attribute offset
   */
  setBufferAttribute(name, bufferName, size, dataType, normalized, stride, offset) {
    this.testDestroyed();
    this.attributes.set(name, {
      type: AttributeTypes.Buffer,
      bufferName,
      normalized,
      offset,
      stride,
      dataType,
      size,
    });
  }

  /**
   * Removes buffer attribute
   * @param {string} name Attribute variable name
   */
  removesBufferAttribute(name) {
    this.testDestroyed();
    this.attributes.delete(name);
  }

  /**
   * Sets array attribute
   * @param {string} name Attribute variable name
   * @param {AttributeTypes} type Array attribute type
   * @param {Iterable<number>} data Array attribute data
   */
  setArrayAttribute(name, type, data) {
    this.testDestroyed();

    this.attributes.set(name, {
      type,
      data,
    });
  }

  /**
   * Removes array attribute
   * @param {string} name Attribute variable name
   */
  removeArrayAttribute(name) {
    this.testDestroyed();
    this.attributes.delete(name);
  }

  /**
   * Sets uniform data
   * @public
   * @param {string} name Uniform variable name
   * @param {Uniform} data Uniform data
   */
  setUniform(name, data) {
    this.testDestroyed();

    this.uniforms.set(name, data);
  }

  /**
   * Removes uniform data
   * @public
   * @param {string} name Uniform variable name
   */
  removeUniform(name) {
    this.testDestroyed();
    this.uniforms.delete(name);
  }

  /**
   * @private
   */
  testDestroyed() {
    if (this.destroyed) throw new Error("renderable object already destroyed");
  }

  /**
   * Destroys this object
   * @public
   * @param {WebGL2RenderingContext} gl
   */
  destroy(gl) {
    this.testDestroyed();

    this._bufferPools.forEach((buffer) => {
      if (buffer.reuse) return;
      gl.deleteBuffer(buffer.buffer);
    });
    this._bufferPools.clear();
    this.attributes.clear();
    this.uniforms.clear();
    this.destroyed = true;
  }

  /**
   * Sets material
   * @param {import("../material/material.js").Material | undefined} material Material
   */
  setMaterial(material) {
    this.material = material;
  }
}
