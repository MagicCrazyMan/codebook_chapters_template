export class Uniform {
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
   * @param {BufferSource} data
   * @param {boolean} [transpose]
   * @param {number} [srcOffset]
   * @param {number} [srcLength]
   */
  constructor(data, transpose = false, srcOffset = 0, srcLength = 0) {
    this.data = data;
    this.transpose = transpose;
    this.srcOffset = srcOffset;
    this.srcLength = srcLength;
  }
}
