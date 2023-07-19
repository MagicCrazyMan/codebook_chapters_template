/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { mat4, quat, vec3 } from "gl-matrix";

/**
 * @abstract
 */
export class Geometry {
  /**
   * @type {vec3}
   * @private
   */
  position = vec3.create();
  /**
   * @type {vec3}
   * @private
   */
  rotation = vec3.create();
  /**
   * @type {vec3}
   * @private
   */
  scale = vec3.fromValues(1, 1, 1);

  /**
   * @type {mat4}
   * @private
   */
  modelMatrix = mat4.create();

  /**
   * Constructs a new basic geometry.
   *
   * This is an abstract class, do no use directly.
   * @param {import("gl-matrix").ReadonlyVec3} [position]
   * @param {import("gl-matrix").ReadonlyVec3} [rotation]
   * @param {import("gl-matrix").ReadonlyVec3} [scale]
   */
  constructor(position, rotation, scale) {
    if (position) this.setPosition(position);
    if (rotation) this.setRotation(rotation);
    if (scale) this.setScale(scale);
    this.updateModelMatrix();
  }

  /**
   * Sets geometry position.
   * @param {import("gl-matrix").ReadonlyVec3} position
   */
  setPosition(position) {
    vec3.copy(this.position, position);
  }

  /**
   * Sets geometry rotation.
   * @param {import("gl-matrix").ReadonlyVec3} rotation
   */
  setRotation(rotation) {
    vec3.copy(this.rotation, rotation);
  }

  /**
   * Sets geometry scale.
   * @param {import("gl-matrix").ReadonlyVec3} scale
   */
  setScale(scale) {
    vec3.copy(this.scale, scale);
  }

  /**
   * Gets geometry position.
   */
  getPosition() {
    return this.position;
  }

  /**
   * Gets geometry rotation.
   */
  getRotation() {
    return this.rotation;
  }

  /**
   * Gets geometry scale.
   */
  getScale() {
    return this.scale;
  }

  /**
   * Updates model matrix.
   */
  updateModelMatrix() {
    mat4.fromRotationTranslationScale(
      this.modelMatrix,
      quat.fromEuler(quat.create(), this.rotation[0], this.rotation[1], this.rotation[2]),
      this.position,
      this.scale
    );
  }

  /**
   * Gets model matrix.
   * @returns {mat4}
   */
  getModelMatrix() {
    return this.modelMatrix;
  }
}
