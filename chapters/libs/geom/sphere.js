import { Geometry } from "./geometry.js";

/**
 * Create a sphere indexed mesh
 * @param {number} radius Sphere radius
 * @param {number} [verticalSegments]
 * @param {number} [horizontalSegments]
 */
export const createSphere = (
  radius,
  verticalSegments = 12,
  horizontalSegments = verticalSegments
) => {
  const verticalOffset = Math.PI / verticalSegments;
  const horizontalOffset = Math.PI / horizontalSegments;

  const vertices = [];
  for (let i = 0; i <= verticalSegments; i++) {
    const ri = i * verticalOffset;
    const ci = Math.cos(ri);
    const si = Math.sin(ri);

    for (let j = 0; j <= verticalSegments; j++) {
      const rj = j * 2 * horizontalOffset;
      const cj = Math.cos(rj);
      const sj = Math.sin(rj);

      const x = radius * si * cj;
      const y = radius * ci;
      const z = radius * si * sj;
      vertices.push(x, y, z);
    }
  }

  const indices = [];
  for (let i = 0; i < verticalSegments; i++) {
    for (let j = 0; j < verticalSegments; j++) {
      const p0 = i * verticalSegments + j;
      const p1 = p0 + verticalSegments;
      const p2 = p1 + 1;
      const p3 = p0 + 1;

      indices.push(p0, p1, p2);
      indices.push(p0, p2, p3);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
};

// /**
//  * Create a sphere mesh
//  * @param {number} radius Sphere radius
//  * @param {number} [verticalSegments]
//  * @param {number} [horizontalSegments]
//  */
// export const createSphereTriangles = (
//   radius,
//   verticalSegments = 12,
//   horizontalSegments = verticalSegments
// ) => {
//   const verticalOffset = Math.PI / verticalSegments;
//   const horizontalOffset = Math.PI / horizontalSegments;

//   const vertices = [];
//   for (let i = 0; i <= verticalSegments; i++) {
//     const ri = i * verticalOffset;
//     const ci = Math.cos(ri);
//     const si = Math.sin(ri);

//     for (let j = 0; j <= verticalSegments; j++) {
//       const rj = j * 2 * horizontalOffset;
//       const cj = Math.cos(rj);
//       const sj = Math.sin(rj);

//       const x = radius * si * cj;
//       const y = radius * ci;
//       const z = radius * si * sj;
//       vertices.push(x, y, z);
//     }
//   }

//   const indices = [];
//   for (let i = 0; i < verticalSegments; i++) {
//     for (let j = 0; j < verticalSegments; j++) {
//       const p0 = i * verticalSegments + j;
//       const p1 = p0 + verticalSegments;
//       const p2 = p1 + 1;
//       const p3 = p0 + 1;

//       indices.push(p0, p1, p2);
//       indices.push(p0, p2, p3);
//     }
//   }

//   return {
//     vertices: new Float32Array(vertices),
//     indices: new Uint16Array(indices),
//   };
// };

export class Sphere extends Geometry {
  /**
   * @type {number}
   * @readonly
   */
  radius;
  /**
   * @type {number}
   * @readonly
   */
  verticalSegments;
  /**
   * @type {number}
   * @readonly
   */
  horizontalSegments;

  /**
   * @type {Float32Array}
   * @private
   */
  _vertices;

  /**
   * @type {Uint16Array}
   * @private
   */
  _indices;

  /**
   * Constructs a sphere geometry
   * @param {number} radius Sphere radius
   * @param {number} [verticalSegments]
   * @param {number} [horizontalSegments]
   * @param {import("gl-matrix").ReadonlyVec3} [position]
   * @param {import("gl-matrix").ReadonlyVec3} [rotation]
   * @param {import("gl-matrix").ReadonlyVec3} [scale]
   */
  constructor(radius, verticalSegments, horizontalSegments, position, rotation, scale) {
    super(position, rotation, scale);
    this.radius = radius;
    this.verticalSegments = verticalSegments;
    this.horizontalSegments = horizontalSegments;
    const sphere = createSphere(radius, verticalSegments, horizontalSegments);
    this._vertices = sphere.vertices;
    this._indices = sphere.indices;
  }
}
