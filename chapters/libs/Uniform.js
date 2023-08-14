/**
 * Uniform types, mapping to WebGL enums.
 * @enum {number}
 */
export const UniformType = {
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

export class ArrayUniform {
  /**
   * @type {UniformType}
   * @readonly
   */
  type;

  /**
   *
   * @type {BufferSource}
   * @readonly
   */
  data;

  /**
   * @type {boolean}
   * @readonly
   */
  transpose;

  /**
   * @type {number}
   * @readonly
   */
  srcOffset;

  /**
   * @type {number}
   * @readonly
   */
  srcLength;

  /**
   *
   * @param {UniformType} type
   * @param {BufferSource} data
   * @param {boolean} [transpose]
   * @param {number} [srcOffset]
   * @param {number} [srcLength]
   */
  constructor(type, data, transpose = false, srcOffset = 0, srcLength = 0) {
    this.type = type;
    this.data = data;
    this.transpose = transpose;
    this.srcOffset = srcOffset;
    this.srcLength = srcLength;
  }
}
