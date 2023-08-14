import { BufferTarget, BufferUsage } from "./WebGLRenderer";

/**
 * Attribute types, mapping to WebGL enums.
 * @enum {number}
 */
export const ArrayAttributeType = {
  FloatVector1: 0,
  FloatVector2: 1,
  FloatVector3: 2,
  FloatVector4: 3,
  IntVector4: 4,
  UnsignedIntVector4: 5,
};

export class ArrayAttribute {
  /**
   * ArrayBuffer source
   * @type {BufferSource}
   * @readonly
   */
  data;

  /**
   * Attribute type
   * @type {ArrayAttributeType}
   * @readonly
   */
  type;

  /**
   *
   * @param {BufferSource} data
   * @param {ArrayAttributeType} type
   */
  constructor(data, type) {
    this.data = data;
    this.type = type;
  }
}

/**
 * Buffer attribute data types, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferAttributeDataType = {
  Byte: 0,
  Short: 1,
  UnsignedByte: 2,
  UnsignedShort: 3,
  Float: 4,
  HalfFloat: 5,
  Int: 6,
  UnsignedInt: 7,
  Int_2_10_10_10_Rev: 8,
  UnsignedInt_2_10_10_10_Rev: 9,
};

export class BufferDescriptor {
  /**
   * @type {BufferSource}
   * @readonly
   */
  data;

  /**
   * @type {BufferAttributeDataType}
   * @readonly
   */
  type;

  /**
   * @type {BufferTarget}
   * @readonly
   */
  target;

  /**
   * @type {BufferUsage}
   * @readonly
   */
  usage;

  /**
   * @type {boolean}
   */
  updated;

  /**
   *
   * @param {BufferSource} data
   * @param {BufferAttributeDataType} [type]
   * @param {BufferTarget} [target]
   * @param {BufferUsage} [usage]
   */
  constructor(
    data,
    type = BufferAttributeDataType.Float,
    target = BufferTarget.ArrayBuffer,
    usage = BufferUsage.StaticDraw
  ) {
    this.data = data;
    this.type = type;
    this.target = target;
    this.usage = usage;
  }
}

export class BufferAttribute {
  /**
   * @type {string}
   * @readonly
   */
  bufferName;

  /**
   * @type {BufferSource}
   * @readonly
   */
  data;

  /**
   * @type {boolean}
   */
  updated;

  /**
   * @type {BufferAttributeDataType}
   * @readonly
   */
  type;

  /**
   * @type {number}
   * @readonly
   */
  size;

  /**
   * @type {boolean}
   * @readonly
   */
  normalized;

  /**
   * @type {number}
   * @readonly
   */
  stride;

  /**
   * @type {number}
   * @readonly
   */
  offset;

  /**
   * @type {BufferTarget}
   * @readonly
   */
  target;

  /**
   * @type {BufferUsage}
   * @readonly
   */
  usage;

  /**
   *
   * @param {string} bufferName
   * @param {BufferSource} data
   * @param {number} size
   * @param {BufferAttributeDataType} [type]
   * @param {boolean} [normalized]
   * @param {number} [stride]
   * @param {number} [offset]
   * @param {BufferTarget} [target]
   * @param {BufferUsage} [usage]
   */
  constructor(
    bufferName,
    data,
    size,
    type = BufferAttributeDataType.Float,
    normalized = false,
    stride = 0,
    offset = 0,
    target = BufferTarget.ArrayBuffer,
    usage = BufferUsage.StaticDraw
  ) {
    this.bufferName = bufferName;
    this.data = data;
    this.type = type;
    this.size = size;
    this.normalized = normalized;
    this.stride = stride;
    this.offset = offset;
    this.target = target;
    this.usage = usage;
  }
}

export class ReuseBufferAttribute {
  /**
   * @type {string}
   * @readonly
   */
  bufferName;

  /**
   * @type {BufferAttributeDataType}
   * @readonly
   */
  type;

  /**
   * @type {number}
   * @readonly
   */
  size;

  /**
   * @type {boolean}
   * @readonly
   */
  normalized;

  /**
   * @type {number}
   * @readonly
   */
  stride;

  /**
   * @type {number}
   * @readonly
   */
  offset;

  /**
   *
   * @param {string} bufferName
   * @param {number} size
   * @param {BufferAttributeDataType} [type]
   * @param {boolean} [normalized]
   * @param {number} [stride]
   * @param {number} [offset]
   */
  constructor(bufferName, size, type, normalized, stride, offset) {
    this.bufferName = bufferName;
    this.type = type;
    this.size = size;
    this.normalized = normalized;
    this.stride = stride;
    this.offset = offset;
  }
}
