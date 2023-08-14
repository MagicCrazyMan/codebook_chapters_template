import { v4 } from "uuid";
import { BufferAttributeDataType, BufferTarget, BufferUsage } from "./Constants.js";

/**
 * Attribute from array
 */
export class ArrayAttribute {
  /**
   * ArrayBuffer source
   * @type {BufferSource}
   * @readonly
   */
  data;

  /**
   * Attribute type
   * @type {import("./Constants.js").ArrayAttributeType}
   * @readonly
   */
  type;

  /**
   *
   * @param {BufferSource} data
   * @param {import("./Constants.js").ArrayAttributeType} type
   */
  constructor(data, type) {
    this.data = data;
    this.type = type;
  }
}

/**
 * Buffer descriptor
 */
export class BufferDescriptor {
  /**
   * @type {string}
   * @readonly
   */
  name;

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

  get bytesPerElement() {
    switch (this.type) {
      case BufferAttributeDataType.Byte:
        return 1;
      case BufferAttributeDataType.Float:
        return 4;
      case BufferAttributeDataType.HalfFloat:
        return 2;
      case BufferAttributeDataType.Int:
        return 4;
      case BufferAttributeDataType.Int_2_10_10_10_Rev:
        return 4;
      case BufferAttributeDataType.Short:
        return 2;
      case BufferAttributeDataType.UnsignedByte:
        return 1;
      case BufferAttributeDataType.UnsignedInt:
        return 4;
      case BufferAttributeDataType.UnsignedInt_2_10_10_10_Rev:
        return 4;
      case BufferAttributeDataType.UnsignedShort:
        return 2;
      default:
        throw new Error(`unknown buffer attribute data type ${this.type}`);
    }
  }

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
   * @param {string} [name]
   */
  constructor(
    data,
    type = BufferAttributeDataType.Float,
    target = BufferTarget.ArrayBuffer,
    usage = BufferUsage.StaticDraw,
    name = v4()
  ) {
    this.data = data;
    this.type = type;
    this.target = target;
    this.usage = usage;
    this.name = name;
  }
}

/**
 * Attribute from buffer
 */
export class BufferAttribute {
  /**
   * @type {BufferDescriptor}
   * @readonly
   */
  descriptor;

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
  byteStride;

  /**
   * @type {number}
   * @readonly
   */
  byteOffset;

  /**
   *
   * @param {BufferDescriptor} descriptor
   * @param {number} size
   * @param {boolean} [normalized]
   * @param {number} [byteStride]
   * @param {number} [byteOffset]
   */
  constructor(descriptor, size, normalized = false, byteStride = 0, byteOffset = 0) {
    this.descriptor = descriptor;
    this.size = size;
    this.normalized = normalized;
    this.byteStride = byteStride;
    this.byteOffset = byteOffset;
  }
}
