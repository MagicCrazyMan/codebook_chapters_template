/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { PerspectiveCamera } from "../camera/perspective";
import { Geometry } from "./geometry";

/**
 * Geometry for render in WebGL.
 * @abstract
 */
export class RenderGeometry extends Geometry {
  /**
   * Constructs a new basic geometry.
   *
   * This is an abstract class, do no use directly.
   * @param {vec3} [position]
   * @param {vec3} [rotation]
   * @param {vec3} [scale]
   */
  constructor(position, rotation, scale) {
    super(position, rotation, scale);
  }

  /**
   * Render geometry.
   * @abstract
   * @param {WebGL2RenderingContext} gl WebGL rendering context
   * @param {PerspectiveCamera} camera scene main camera
   */
  render(gl, camera) {}
}
