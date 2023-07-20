import { vec3 } from "gl-matrix";
import { Geometry } from "./geometry";

export class Plane extends Geometry {
  /**
   * @type {vec3}
   * @readonly
   */
  normal;
  /**
   * @type {vec3}
   * @readonly
   */
  origin;
  /**
   * @type {number}
   * @readonly
   */
  width;
  /**
   * @type {number}
   * @readonly
   */
  height;

  /**
   * @type {Float32Array}
   * @private
   */
  _vertices;

  /**
   * @type {Float32Array}
   * @private
   */
  _normals;

  /**
   * Constructs a plane geometry
   * @param {import("gl-matrix").ReadonlyVec3} normal normal of plane
   * @param {number} origin offset from plane to origin
   * @param {number} width plane width
   * @param {number} height plane height
   * @param {import("gl-matrix").ReadonlyVec3} [position]
   * @param {import("gl-matrix").ReadonlyVec3} [rotation]
   * @param {import("gl-matrix").ReadonlyVec3} [scale]
   */
  constructor(normal, origin, width, height, position, rotation, scale) {
    super(position, rotation, scale);
    this.normal = normal;
    this.origin = origin;
    this.width = width;
    this.height = height;

    const halfWidth = width / 2
    const halfHeight = height / 2
    // prettier-ignore
    this._vertices = new Float32Array([
      halfWidth, halfHeight, 0,   halfWidth, -halfHeight, 0,  -halfWidth, -halfHeight, 0,
      halfWidth, halfHeight, 0,  -halfWidth, -halfHeight, 0,  -halfWidth,  halfHeight, 0,
    ])
    // prettier-ignore
    this._normals = new Float32Array([
      normal[0], normal[1], normal[2],  normal[0], normal[1], normal[2],  normal[0], normal[1], normal[2],
      normal[0], normal[1], normal[2],  normal[0], normal[1], normal[2],  normal[0], normal[1], normal[2],
    ])
  }
}
