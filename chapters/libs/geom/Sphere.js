import { BufferAttribute, BufferDescriptor } from "../Attribute.js";
import { DrawMode } from "../Constants.js";
import { EntityAttributeNames, RenderEntity } from "../entity/RenderEntity.js";

/**
 * Create a sphere indexed mesh
 * @param {number} radius Sphere radius
 * @param {number} [verticalSegments] vertical segments count, default `12`
 * @param {number} [horizontalSegments] horizontal segments count, default `verticalSegments * 2`
 */
export const createSphere = (
  radius,
  verticalSegments = 12,
  horizontalSegments = 2 * verticalSegments
) => {
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

  const indices = new Uint16Array(verticalSegments * horizontalSegments * 2 * 3);
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
 * @param {number} [verticalSegments] vertical segments count, default `12`
 * @param {number} [horizontalSegments] horizontal segments count, default `verticalSegments * 2`
 */
export const createSphereTriangulated = (
  radius,
  verticalSegments = 12,
  horizontalSegments = 2 * verticalSegments
) => {
  const verticalOffset = Math.PI / verticalSegments;
  const horizontalOffset = (2 * Math.PI) / horizontalSegments;

  const vertices = new Float32Array((verticalSegments + 1) * (horizontalSegments + 1) * 3);
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
    }
  }

  const triangleVertices = new Float32Array(verticalSegments * horizontalSegments * 2 * 3 * 3);
  const triangleNormals = new Float32Array(verticalSegments * horizontalSegments * 2 * 3 * 4);
  for (let i = 0; i < verticalSegments; i++) {
    for (let j = 0; j < horizontalSegments; j++) {
      const index0 = i * (horizontalSegments + 1) + j;
      const index1 = index0 + (horizontalSegments + 1);
      const index2 = index1 + 1;
      const index3 = index0 + 1;

      const vertex0 = vertices.slice(index0 * 3 + 0, index0 * 3 + 3);
      const vertex1 = vertices.slice(index1 * 3 + 0, index1 * 3 + 3);
      const vertex2 = vertices.slice(index2 * 3 + 0, index2 * 3 + 3);
      const vertex3 = vertices.slice(index3 * 3 + 0, index3 * 3 + 3);

      const d0 = Math.hypot(vertex0[0], vertex0[1], vertex0[2]);
      const normal0 = [vertex0[0] / d0, vertex0[1] / d0, vertex0[2] / d0, 1];
      const d1 = Math.hypot(vertex1[0], vertex1[1], vertex1[2]);
      const normal1 = [vertex1[0] / d1, vertex1[1] / d1, vertex1[2] / d1, 1];
      const d2 = Math.hypot(vertex2[0], vertex2[1], vertex2[2]);
      const normal2 = [vertex2[0] / d2, vertex2[1] / d2, vertex2[2] / d2, 1];
      const d3 = Math.hypot(vertex3[0], vertex3[1], vertex3[2]);
      const normal3 = [vertex3[0] / d3, vertex3[1] / d3, vertex3[2] / d3, 1];

      triangleVertices.set(vertex0, (i * horizontalSegments + j) * 18 + 0);
      triangleVertices.set(vertex2, (i * horizontalSegments + j) * 18 + 3);
      triangleVertices.set(vertex1, (i * horizontalSegments + j) * 18 + 6);
      triangleVertices.set(vertex0, (i * horizontalSegments + j) * 18 + 9);
      triangleVertices.set(vertex3, (i * horizontalSegments + j) * 18 + 12);
      triangleVertices.set(vertex2, (i * horizontalSegments + j) * 18 + 15);

      triangleNormals.set(normal0, (i * horizontalSegments + j) * 24 + 0);
      triangleNormals.set(normal2, (i * horizontalSegments + j) * 24 + 4);
      triangleNormals.set(normal1, (i * horizontalSegments + j) * 24 + 8);
      triangleNormals.set(normal0, (i * horizontalSegments + j) * 24 + 12);
      triangleNormals.set(normal3, (i * horizontalSegments + j) * 24 + 16);
      triangleNormals.set(normal2, (i * horizontalSegments + j) * 24 + 20);
    }
  }

  return {
    vertices: triangleVertices,
    normals: triangleNormals,
  };
};

export class Sphere extends RenderEntity {
  /**
   * Sphere radius.
   * @type {number}
   * @readonly
   */
  radius;
  /**
   * Sphere vertical segment counts.
   * @type {number}
   * @readonly
   */
  verticalSegments;
  /**
   * Sphere horizontal segment counts.
   * @type {number}
   * @readonly
   */
  horizontalSegments;

  /**
   * Draw mode
   */
  drawMode = DrawMode.Triangles;

  /**
   * Constructs a sphere geometry
   * @param {number} [radius] Sphere radius
   * @param {number} [verticalSegments] vertical segments count, default `12`
   * @param {number} [horizontalSegments] horizontal segments count, default `verticalSegments * 2`
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scaling
   */
  constructor(radius = 1, verticalSegments, horizontalSegments, translation, rotation, scaling) {
    super({ translation, rotation, scaling });
    this.radius = radius;
    this.verticalSegments = verticalSegments;
    this.horizontalSegments = horizontalSegments;

    const { vertices, normals } = createSphereTriangulated(
      radius,
      verticalSegments,
      horizontalSegments
    );

    this.attributes.set(
      EntityAttributeNames.Position,
      new BufferAttribute(new BufferDescriptor(new Float32Array(vertices)), 3)
    );
    this.attributes.set(
      EntityAttributeNames.Normal,
      new BufferAttribute(new BufferDescriptor(new Float32Array(normals)), 4)
    );

    this.verticesCount = vertices.length / 3;
  }
}
