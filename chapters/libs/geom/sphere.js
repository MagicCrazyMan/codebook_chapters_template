import { Geometry } from "./geometry.js";

/**
 * Create a sphere indexed mesh
 * @param {number} radius Sphere radius
 * @param {number} [verticalSegments]
 * @param {number} [horizontalSegments]
 */
export const createSphere = (radius, verticalSegments, horizontalSegments = verticalSegments) => {
  const verticalOffset = Math.PI / verticalSegments;
  const horizontalOffset = (2 * Math.PI) / horizontalSegments;

  const vertices = new Float32Array((verticalSegments + 1) * (horizontalSegments + 1) * 3);
  const normals = new Float32Array((verticalSegments + 1) * (horizontalSegments + 1) * 3);
  for (let i = 0; i <= verticalSegments; i++) {
    const ri = i * verticalOffset;
    const ci = Math.cos(ri);
    const si = Math.sin(ri);

    for (let j = 0; j <= horizontalSegments; j++) {
      const rj = j * horizontalOffset;
      const cj = Math.cos(rj);
      const sj = Math.sin(rj);

      const x = radius * si * cj;
      const y = radius * ci;
      const z = radius * si * sj;
      vertices[(i * (horizontalSegments + 1) + j) * 3 + 0] = x;
      vertices[(i * (horizontalSegments + 1) + j) * 3 + 1] = y;
      vertices[(i * (horizontalSegments + 1) + j) * 3 + 2] = z;

      const length = Math.hypot(x, y, z);
      normals[(i * (horizontalSegments + 1) + j) * 3 + 0] = x / length;
      normals[(i * (horizontalSegments + 1) + j) * 3 + 1] = y / length;
      normals[(i * (horizontalSegments + 1) + j) * 3 + 2] = z / length;
    }
  }

  const indices = new Uint16Array((verticalSegments + 1) * horizontalSegments * 6);
  for (let i = 0; i < verticalSegments; i++) {
    for (let j = 0; j < horizontalSegments; j++) {
      const p0 = i * (horizontalSegments + 1) + j;
      const p1 = p0 + (horizontalSegments + 1);
      const p2 = p1 + 1;
      const p3 = p0 + 1;

      indices[(i * horizontalSegments + j) * 6 + 0] = p0;
      indices[(i * horizontalSegments + j) * 6 + 1] = p2;
      indices[(i * horizontalSegments + j) * 6 + 2] = p1;
      indices[(i * horizontalSegments + j) * 6 + 3] = p0;
      indices[(i * horizontalSegments + j) * 6 + 4] = p3;
      indices[(i * horizontalSegments + j) * 6 + 5] = p2;
    }
  }

  return {
    vertices,
    normals,
    indices,
  };
};

/**
 * Create a sphere triangulated mesh
 * @param {number} radius Sphere radius
 * @param {number} [verticalSegments]
 * @param {number} [horizontalSegments]
 */
export const createSphereTriangulated = (
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
