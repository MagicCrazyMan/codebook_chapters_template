import { BufferAttribute, BufferDescriptor } from "../Attribute.js";
import { DrawMode } from "../Constants.js";
import { EntityAttributeNames, RenderEntity } from "../entity/RenderEntity.js";

export class Plane extends RenderEntity {
  /**
   * Plane width along X axis.
   * @type {number}
   * @readonly
   */
  width;

  /**
   * Plane height along Y axis.
   * @type {number}
   * @readonly
   */
  height;

  drawMode = DrawMode.Triangles;

  verticesCount = 6;

  /**
   * Constructs a plane geometry in WebGL XY plane where origin center of the plane
   * @param {number} [width] Plane width along X axis. Default 1.
   * @param {number} [height] Plane width along Y axis. Default 1.
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation.
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation.
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scaling.
   */
  constructor(width, height, translation, rotation, scaling) {
    super({ translation, rotation, scaling });
    this.width = width ?? 1;
    this.height = height ?? 1;

    const halfWidth = this.width / 2;
    const halfHeight = this.height / 2;
    // prettier-ignore
    const vertices = new Float32Array([
      halfWidth, halfHeight,  -halfWidth,  halfHeight,  -halfWidth, -halfHeight,
      halfWidth, halfHeight,  -halfWidth, -halfHeight,   halfWidth, -halfHeight,
    ]);
    this.attributes.set(
      EntityAttributeNames.Position,
      new BufferAttribute(new BufferDescriptor(vertices), 2)
    );
  }
}
