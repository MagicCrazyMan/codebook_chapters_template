import { v4 } from "uuid";
import { BufferTarget, BufferUsage } from "./Constants.js";

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
  stride;

  /**
   * @type {number}
   * @readonly
   */
  offset;

  /**
   *
   * @param {BufferDescriptor} descriptor
   * @param {number} size
   * @param {boolean} [normalized]
   * @param {number} [stride]
   * @param {number} [offset]
   */
  constructor(descriptor, size, normalized = false, stride = 0, offset = 0) {
    this.descriptor = descriptor;
    this.size = size;
    this.normalized = normalized;
    this.stride = stride;
    this.offset = offset;
  }
}
