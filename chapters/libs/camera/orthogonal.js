import { mat4 } from "gl-matrix";
import { Camera } from "./camera.js";

/**
 * Orthogonal Camera
 */
export class OrthogonalCamera extends Camera {
  /**
   * Left bound of the frustum.
   * @type {number}
   * @readonly
   */
  left = -1;
  /**
   * Right bound of the frustum.
   * @type {number}
   * @readonly
   */
  right = 1;
  /**
   * Top bound of the frustum.
   * @type {number}
   * @readonly
   */
  top = 1;
  /**
   * Bottom bound of the frustum.
   * @type {number}
   * @readonly
   */
  bottom = -1;
  /**
   * Near bound of the frustum.
   * @type {number}
   * @readonly
   */
  near = -1;
  /**
   * Far bound of the frustum.
   * @type {number}
   * @readonly
   */
  far = 1;

  /**
   * Constructs a orthogonal camera
   * @param {number} left Left bound of the frustum
   * @param {number} right Right bound of the frustum
   * @param {number} bottom Bottom bound of the frustum
   * @param {number} top Top bound of the frustum
   * @param {number} near Near bound of the frustum
   * @param {number} far Far bound of the frustum
   * @param {number} [aspect] Camera aspect ratio. typically viewport width/height
   * @param {import("gl-matrix").ReadonlyVec3} [position] Camera position, default `vec3(0, 0, 0)`
   * @param {import("gl-matrix").ReadonlyVec3} [lookAt] Camera look at position, default `vec3(0, 0, 0)`
   * @param {import("gl-matrix").ReadonlyVec3} [up] Camera up vector, default `vec3(0, 1, 0)`
   */
  constructor(left, right, bottom, top, near, far, aspect, position, lookAt, up) {
    super(position, lookAt, up, aspect);
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.near = near;
    this.far = far || 1;

    this.updateProjectionMatrix();
    this.updateViewProjectionMatrix();
  }

  /**
   * Sets left bound of the frustum.
   * @param {number} left Left bound of the frustum
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setLeft(left, update = false) {
    this.left = left;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets right bound of the frustum.
   * @param {number} right Right bound of the frustum
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setRight(right, update = false) {
    this.right = right;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets bottom bound of the frustum.
   * @param {number} bottom Bottom bound of the frustum
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setBottom(bottom, update = false) {
    this.bottom = bottom;

    if (update) {
      this.updateProjectionMatrix();
      this.updateViewProjectionMatrix();
    }
  }

  /**
   * Sets top bound of the frustum.
   * @param {number} top Top bound of the frustum
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setTop(top, update = false) {
    this.top = top;

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
    mat4.ortho(
      this.projectionMatrix,
      this.left * this.aspect,
      this.right * this.aspect,
      this.bottom,
      this.top,
      this.near,
      this.far
    );
  }
}
