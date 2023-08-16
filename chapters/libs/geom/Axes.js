import { vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../Attribute.js";
import { DrawMode } from "../Constants.js";
import { EntityAttributeNames, RenderEntity } from "../entity/RenderEntity.js";
import { PerVertexColorMaterial } from "../material/PerVertexColorMaterial.js";

export class Axes extends RenderEntity {
  /**
   * Draw mode
   */
  drawMode = DrawMode.Lines;

  verticesCount = 6;

  // set a default material
  material = new PerVertexColorMaterial(
    new Float32Array([1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1])
  );

  /**
   * Constructs a sphere geometry
   * @param {number} [length] Axes length
   * @param {import("gl-matrix").ReadonlyVec3} [xAxis] X Axis
   * @param {import("gl-matrix").ReadonlyVec3} [yAxis] Y Axis
   * @param {import("gl-matrix").ReadonlyVec3} [zAxis] Z Axis
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scaling
   */
  constructor(length, xAxis, yAxis, zAxis, translation, rotation, scaling) {
    super({ translation, rotation, scaling });
    xAxis = xAxis ? vec3.normalize(vec3.create(), xAxis) : vec3.fromValues(1, 0, 0);
    yAxis = yAxis ? vec3.normalize(vec3.create(), yAxis) : vec3.fromValues(0, 1, 0);
    zAxis = zAxis ? vec3.normalize(vec3.create(), zAxis) : vec3.fromValues(0, 0, 1);
    xAxis = vec3.scale(xAxis, xAxis, length);
    yAxis = vec3.scale(yAxis, yAxis, length);
    zAxis = vec3.scale(zAxis, zAxis, length);

    // prettier-ignore
    const vertices = new Float32Array([
      0, 0, 0, xAxis[0], xAxis[1], xAxis[2],
      0, 0, 0, yAxis[0], yAxis[1], yAxis[2],
      0, 0, 0, zAxis[0], zAxis[1], zAxis[2],
    ]);
    this.attributes.set(
      EntityAttributeNames.Position,
      new BufferAttribute(new BufferDescriptor(vertices), 3)
    );
  }
}
