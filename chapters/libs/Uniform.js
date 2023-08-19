export class Uniform {
  /**
   *
   * @type {BufferSource}
   * @readonly
   */
  data

  /**
   * @type {import("./Constants.js").UniformType}
   */
  type;

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
   * @param {import("./Constants.js").UniformType} type
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
