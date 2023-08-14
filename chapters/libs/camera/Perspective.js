import { mat4 } from "gl-matrix";
import { Camera } from "./Camera.js";

/**
 * Perspective Camera
 */
export class PerspectiveCamera extends Camera {
  /**
   * Perspective camera vertical field of view, in radians.
   * @type {number}
   * @readonly
   */
  fovy = 0;
  /**
   * Near bound of the frustum.
   * @type {number}
   * @readonly
   */
  near = 0;
  /**
   * Far bound of the frustum.
   * @type {number | null}
   * @readonly
   */
  far = null;

  /**
   * Constructs a perspective camera
   * @param {number} fovy Camera vertical field of view, in radians
   * @param {number} aspect Camera aspect ratio. typically viewport width/height
   * @param {number} near Near bound of the frustum
   * @param {number | null} far Far bound of the frustum, can be `null` or `Infinity`
   * @param {import("gl-matrix").ReadonlyVec3} [position] Camera position, default `vec3(0, 0, 0)`
   * @param {import("gl-matrix").ReadonlyVec3} [lookAt] Camera look at position, default `vec3(0, 0, 0)`
   * @param {import("gl-matrix").ReadonlyVec3} [up] Camera up vector, default `vec3(0, 1, 0)`
   */
  constructor(fovy, aspect, near, far, position, lookAt, up) {
    super(position, lookAt, up, aspect);
    this.fovy = fovy;
    this.near = near;
    this.far = far ?? null;

    this.updateProjectionMatrix();
    this.updateViewProjectionMatrix();
  }

  /**
   * Sets camera vertical field of view.
   * @param {number} fovy Camera vertical field of view, in radians
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setFovy(fovy, update = false) {
    this.fovy = fovy;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets near bound of the frustum of camera.
   * @param {number} near Near bound of the frustum
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setNear(near, update = false) {
    this.near = near;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets far bound of the frustum of camera.
   * @param {number | null} far Far bound of the frustum, can be null or Infinity
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setFar(far, update = false) {
    this.far = far;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Updates projection matrix.
   * This method does not update view projection matrix.
   * @override
   */
  updateProjectionMatrix() {
    mat4.perspective(this.projectionMatrix, this.fovy, this.aspect, this.near, this.far);
  }
}
