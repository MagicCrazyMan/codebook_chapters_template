import { BufferAttribute, BufferDescriptor } from "../Attribute.js";
import { BufferAttributeDataType, BufferTarget, DrawMode } from "../Constants.js";
import { EntityAttributeNames, RenderEntity } from "../entity/RenderEntity.js";

/**
 * Creates a triangulated cube with specified width, height and length
 * @param {number} width Cube width, along X axis
 * @param {number} [height] Cube height, along Y axis
 * @param {number} [length] Cube length, along Z axis
 */
export const createCubeTriangulated = (width, height = width, length = width) => {
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
    0, 0, 1, 0,   0, 0, 1, 0,   0, 0, 1, 0,   0, 0, 1, 0,   0, 0, 1, 0,   0, 0, 1, 0,
    0, 1, 0, 0,   0, 1, 0, 0,   0, 1, 0, 0,   0, 1, 0, 0,   0, 1, 0, 0,   0, 1, 0, 0,
    0, 0,-1, 0,   0, 0,-1, 0,   0, 0,-1, 0,   0, 0,-1, 0,   0, 0,-1, 0,   0, 0,-1, 0,
    0,-1, 0, 0,   0,-1, 0, 0,   0,-1, 0, 0,   0,-1, 0, 0,   0,-1, 0, 0,   0,-1, 0, 0,
   -1, 0, 0, 0,  -1, 0, 0, 0,  -1, 0, 0, 0,  -1, 0, 0, 0,  -1, 0, 0, 0,  -1, 0, 0, 0,
    1, 0, 0, 0,   1, 0, 0, 0,   1, 0, 0, 0,   1, 0, 0, 0,   1, 0, 0, 0,   1, 0, 0, 0,
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
   * Draw mode
   */
  drawMode = DrawMode.Triangles;

  /**
   * Constructs a cube geometry
   * @param {number} [width] Cube width
   * @param {number} [height] Cube height
   * @param {number} [length] Cube length
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scaling
   */
  constructor(width = 1, height = width, length = width, translation, rotation, scaling) {
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
      new BufferAttribute(new BufferDescriptor(new Float32Array(normals)), 4)
    );

    this.verticesCount = vertices.length / 3;
  }
}

/**
 * Creates a indexed cube with specified width, height and length
 * @param {number} [width] Cube width, along X axis
 * @param {number} [height] Cube height, along Y axis
 * @param {number} [length] Cube length, along Z axis
 */
export const createCubeIndexed = (width = 1, height = width, length = width) => {
  const x = width / 2;
  const y = height / 2;
  const z = length / 2;

  //   v6----- v5
  //  /|      /|
  // v1------v0|
  // | |     | |
  // | |v7---|-|v4
  // |/      |/
  // v2------v3
  // prettier-ignore
  const vertices = new Float32Array([
    x, y, z,  -x, y, z,  -x,-y, z,   x,-y, z,
    x, y,-z,  -x, y,-z,  -x, y, z,   x, y, z,
    x, y,-z,  -x, y,-z,  -x,-y,-z,   x,-y,-z,
    x,-y,-z,  -x,-y,-z,  -x,-y, z,   x,-y, z,
   -x, y, z,  -x, y,-z,  -x,-y,-z,  -x,-y, z,
    x, y,-z,   x, y, z,   x,-y, z,   x,-y,-z,
  ]);
  // prettier-ignore
  const normals = new Float32Array([
    0, 0, 1, 0,  0, 0, 1, 0,  0, 0, 1, 0,  0, 0, 1, 0,
    0, 1, 0, 0,  0, 1, 0, 0,  0, 1, 0, 0,  0, 1, 0, 0,
    0, 0,-1, 0,  0, 0,-1, 0,  0, 0,-1, 0,  0, 0,-1, 0,
    0,-1, 0, 0,  0,-1, 0, 0,  0,-1, 0, 0,  0,-1, 0, 0,
   -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0, -1, 0, 0, 0,
    1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,  1, 0, 0, 0,
  ]);
  // prettier-ignore
  const indices = new Uint8Array([
     0, 1, 2,  0, 2, 3, // front
     4, 5, 6,  4, 6, 7, // up
     8,10, 9,  8,11,10, // back
    12,14,13, 12,15,14, // bottom
    16,17,18, 16,18,19, // left
    20,21,22, 20,22,23, // right
  ]);

  return {
    indices,
    vertices,
    normals,
  };
};

export class IndexedCube extends RenderEntity {
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
   * Draw mode
   */
  drawMode = DrawMode.Triangles;

  /**
   * Constructs a cube geometry
   * @param {number} [width] Cube width
   * @param {number} [height] Cube height
   * @param {number} [length] Cube length
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scaling
   */
  constructor(width = 1, height = width, length = width, translation, rotation, scaling) {
    super({ translation, rotation, scaling });
    this.width = width;
    this.height = height;
    this.length = length;

    const { indices, vertices, normals } = createCubeIndexed(width, height, length);

    this.attributes.set(
      EntityAttributeNames.Position,
      new BufferAttribute(new BufferDescriptor(new Float32Array(vertices)), 3)
    );
    this.attributes.set(
      EntityAttributeNames.Normal,
      new BufferAttribute(new BufferDescriptor(new Float32Array(normals)), 4)
    );

    this.indices = new BufferDescriptor(
      indices,
      BufferAttributeDataType.UnsignedByte,
      BufferTarget.ElementArrayBuffer
    );
    this.verticesCount = indices.length;
  }
}
