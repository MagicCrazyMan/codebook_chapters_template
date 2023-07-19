import { vec3 } from "gl-matrix";
import { Geometry } from "./geom/geometry.js";

export class PointLight extends Geometry {
  /**
   * @type {vec3}
   * @private
   */
  lightColor = vec3.create();
  /**
   * @type {number}
   * @private
   */
  lightIntensity = 300;

  /**
   * Constructs a new point light
   * @param {import("gl-matrix").ReadonlyVec3} lightColor light color
   * @param {import("gl-matrix").ReadonlyVec3} lightIntensity light intensity
   * @param {import("gl-matrix").ReadonlyVec3} [position]
   * @param {import("gl-matrix").ReadonlyVec3} [rotation]
   * @param {import("gl-matrix").ReadonlyVec3} [scale]
   */
  constructor(lightColor, lightIntensity, position, rotation, scale) {
    super(position, rotation, scale);
    this.lightColor = lightColor;
    this.lightIntensity = lightIntensity;
  }

  /**
   * Sets light color
   * @param {import("gl-matrix").ReadonlyVec3} lightColor light color
   */
  setLightColor(lightColor) {
    vec3.copy(this.lightColor, lightColor);
  }

  /**
   * Gets light color
   * @returns {import("gl-matrix").ReadonlyVec3}
   */
  getLightColor() {
    return this.lightColor;
  }

  /**
   * Sets light intensity
   * @param {number} lightIntensity light intensity
   */
  setLightIntensity(lightIntensity) {
    this.lightIntensity = lightIntensity;
  }

  /**
   * Gets light intensity
   * @returns {number}
   */
  getLightIntensity() {
    return this.lightIntensity;
  }
}
