import { BufferAttribute, BufferDescriptor } from "../Attribute.js";
import { EntityAttributeNames, RenderEntity } from "../entity/RenderEntity.js";

/**
 *
 * @param {number} width
 * @param {number} height
 * @param {number} length
 */
export const createCubeTriangulated = (width, height, length) => {
  const x = width / 2;
  const y = height / 2;
  const z = length / 2;

  // prettier-ignore
  const vertices = new Float32Array([
    -x, y, z,  -x,-y, z,   x, y, z,  x, y, z,  -x,-y, z,  x,-y, z, // front
    -x, y,-z,  -x, y, z,   x, y,-z,  x, y,-z,  -x, y, z,  x, y, z, // up
    -x, y,-z,   x, y,-z,  -x,-y,-z,  x, y,-z,   x,-y,-z, -x,-y,-z, // back
    -x,-y,-z,   x,-y,-z,  -x,-y, z,  x,-y,-z,   x,-y, z, -x,-y, z, // bottom
    -x, y,-z,  -x,-y,-z,  -x, y, z, -x, y, z,  -x,-y,-z, -x,-y, z, // left
     x, y, z,   x,-y, z,   x, y,-z,  x, y,-z,   x,-y, z,  x,-y,-z, // right
  ]);
  // prettier-ignore
  const normals = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
    0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,  0, 0,-1,
    0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,
   -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
  ]);

  return {
    vertices,
    normals,
  };
};

export class Cube extends RenderEntity {
  /**
   * Cube width.
   * @type {number}
   * @readonly
   */
  width;

  /**
   * Cube height.
   * @type {number}
   * @readonly
   */
  height;

  /**
   * Cube length.
   * @type {number}
   * @readonly
   */
  length;

  /**
   * Constructs a cube geometry
   * @param {number} width Cube width
   * @param {number} height Cube height
   * @param {number} length Cube length
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scaling
   */
  constructor(width, height, length, translation, rotation, scaling) {
    super({ translation, rotation, scaling });
    this.width = width;
    this.height = height;
    this.length = length;

    const { vertices, normals } = createCubeTriangulated(width, height, length);

    this.attributes.set(
      EntityAttributeNames.Position,
      new BufferAttribute(new BufferDescriptor(new Float32Array(vertices)), 3)
    );
    this.attributes.set(
      EntityAttributeNames.Normal,
      new BufferAttribute(new BufferDescriptor(new Float32Array(normals)), 3)
    );

    this.verticesCount = vertices.length / 3;
  }
}
