import { mat4, vec3 } from "gl-matrix";
import { abstractMethod } from "../Utils.js";
import { ArrayUniform, UniformType } from "../Uniform.js";

/**
 * @enum {string}
 */
export const CameraUniformNames = {
  Position: "u_CameraPosition",
};

/**
 * Abstract camera.
 * @abstract
 */
export class Camera {
  /**
   * Camera position.
   * @type {vec3}
   * @readonly
   */
  position = vec3.fromValues(0, 0, 1);
  /**
   * Camera look at position.
   * @type {vec3}
   * @readonly
   */
  lookAt = vec3.create();
  /**
   * Camera up vector.
   * @type {vec3}
   * @readonly
   */
  up = vec3.fromValues(0, 1, 0);

  /**
   * Perspective camera aspect.
   * @type {number}
   * @readonly
   */
  aspect = 1;

  /**
   * Camera view matrix
   * @readonly
   */
  viewMatrix = mat4.create();
  /**
   * Camera projection matrix
   * @readonly
   */
  projectionMatrix = mat4.create();
  /**
   * Camera view-projection matrix
   * @readonly
   */
  viewProjectionMatrix = mat4.create();

  /**
   * Should this object updates frame state before rendering.
   * @type {boolean}
   * @readonly
   */
  shouldUpdateFrameState = true;

  /**
   * Uniforms
   * @type {Map<string, ArrayUniform>}
   * @readonly
   */
  uniforms = new Map();

  /**
   * Abstract constructor.
   * @param {import("gl-matrix").ReadonlyVec3} [position] Camera position, default `vec3(0, 0, 0)`
   * @param {import("gl-matrix").ReadonlyVec3} [lookAt] Camera look at position, default `vec3(0, 0, 0)`
   * @param {import("gl-matrix").ReadonlyVec3} [up] Camera up vector, default `vec3(0, 1, 0)`
   * @param {number} [aspect] Camera aspect ratio. typically viewport width/height
   */
  constructor(position, lookAt, up, aspect) {
    if (position) this.setPosition(position);
    if (lookAt) this.setLookAt(lookAt);
    if (up) this.setUpVector(up);
    if (aspect) this.setAspect(aspect);

    this.updateViewMatrix();
    this.uniforms.set(
      CameraUniformNames.Position,
      new ArrayUniform(UniformType.FloatVector3, this.position)
    );
  }

  /**
   * Sets camera position.
   * @param {vec3} position Camera position
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setPosition(position, update = false) {
    this.position = position;

    if (update) {
      this.updateViewMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets camera look at position.
   * @param {vec3} lookAt Camera look at position
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setLookAt(lookAt, update = false) {
    this.lookAt = lookAt;

    if (update) {
      this.updateViewMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets camera up direction.
   * @param {vec3} up Camera up direction
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setUpVector(up, update = false) {
    this.up = up;

    if (update) {
      this.updateViewMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets camera aspect ratio.
   * @param {number} aspect Camera aspect ratio. typically viewport width/height
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setAspect(aspect, update = false) {
    this.aspect = aspect;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Updates view matrix.
   * This method does not update view projection matrix.
   */
  updateViewMatrix() {
    mat4.lookAt(this.viewMatrix, this.position, this.lookAt, this.up);
  }

  /**
   * Updates projection matrix.
   * This method does not update view projection matrix.
   */
  updateProjectionMatrix() {
    abstractMethod();
  }

  /**
   * Updates view matrix.
   * Pleas ensure view and projection matrices up-to-date
   * using {@link updateViewMatrix} and {@link updateProjectionMatrix}
   * before calling this method.
   */
  updateViewProjectionMatrix() {
    mat4.identity(this.viewProjectionMatrix);
    mat4.mul(this.viewProjectionMatrix, this.viewProjectionMatrix, this.projectionMatrix);
    mat4.mul(this.viewProjectionMatrix, this.viewProjectionMatrix, this.viewMatrix);
    this.shouldUpdateFrameState = true;
  }
}
