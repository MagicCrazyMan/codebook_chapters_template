import { vec3 } from "gl-matrix";
import { BasicObject } from "../basic_object.js";

export class PointLight extends BasicObject {
  /**
   * Point light color.
   * @type {vec3}
   * @readonly
   */
  lightColor = vec3.create();
  /**
   * Point light intensity.
   * @type {number}
   * @readonly
   */
  lightIntensity = 300;

  /**
   * Constructs a new point light
   * @param {import("gl-matrix").ReadonlyVec3} lightColor light color
   * @param {number} lightIntensity light intensity
   * @param {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
   * @param {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
   * @param {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scale
   */
  constructor(lightColor, lightIntensity, translation, rotation, scaling) {
    super(translation, rotation, scaling);
    this.setLightColor(lightColor);
    this.setLightIntensity(lightIntensity);
  }

  /**
   * Sets light color
   * @param {import("gl-matrix").ReadonlyVec3} lightColor light color
   */
  setLightColor(lightColor) {
    vec3.copy(this.lightColor, lightColor);
  }

  /**
   * Sets light intensity
   * @param {number} lightIntensity light intensity
   */
  setLightIntensity(lightIntensity) {
    this.lightIntensity = lightIntensity;
  }
}
