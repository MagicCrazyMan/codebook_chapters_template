import { mat4, vec3 } from "gl-matrix";

/**
 * Perspective Camera
 */
export class PerspectiveCamera {
  /**@readonly */
  position = vec3.create();
  /**@readonly */
  lookAt = vec3.create();
  /**@readonly */
  fovy = 0;
  /**@readonly */
  aspect = 0;
  /**@readonly */
  near = 0;
  /**@readonly */
  far = 0;

  /**@private */
  viewMatrix = mat4.create();
  /**@private */
  projMatrix = mat4.create();
  /**@private */
  viewProjMatrix = mat4.create();

  /**
   * Constructs a perspective camera
   * @param {import("gl-matrix").ReadonlyVec3} position Camera position
   * @param {import("gl-matrix").ReadonlyVec3} lookAt Camera look at target
   * @param {number} fovy Camera vertical field of view, in radians
   * @param {number} aspect Camera aspect ratio. typically viewport width/height
   * @param {number} near Near bound of the frustum
   * @param {number | null} far Far bound of the frustum, can be null or Infinity
   */
  constructor(position, lookAt, fovy, aspect, near, far) {
    this.setView(position, lookAt);
    this.setPerspective(fovy, aspect, near, far);
    this.updateViewProjectMatrix();
  }

  /**
   * Sets camera position.
   * @param {import("gl-matrix").ReadonlyVec3} position Camera position
   */
  setPosition(position) {
    vec3.copy(this.position, position)
  }

  /**
   * Sets camera look at target.
   * @param {import("gl-matrix").ReadonlyVec3} lookAt Camera look at target
   */
  setLookAt(lookAt) {
    vec3.copy(this.lookAt, lookAt)
  }

  /**
   * Sets camera vertical field of view.
   * @param {number} fovy Camera vertical field of view, in radians
   */
  setFovy(fovy) {
    this.fovy = fovy;
  }

  /**
   * Sets camera aspect ratio.
   * @param {number} aspect Camera aspect ratio. typically viewport width/height
   */
  setAspect(aspect) {
    this.aspect = aspect;
  }

  /**
   * Sets near bound of the frustum of camera.
   * @param {number} near Near bound of the frustum
   */
  setNear(near) {
    this.near = near;
  }

  /**
   * Sets far bound of the frustum of camera.
   * @param {number | null} far Far bound of the frustum, can be null or Infinity
   */
  setFar(far) {
    this.far = far;
  }

  /**
   * Sets camera view.
   * @param {import("gl-matrix").ReadonlyVec3} position Camera position
   * @param {import("gl-matrix").ReadonlyVec3} lookAt Camera look at target
   */
  setView(position, lookAt) {
    vec3.copy(this.position, position)
    vec3.copy(this.lookAt, lookAt)
  }

  /**
   * Sets camera projection.
   * @param {number} fovy Camera vertical field of view, in radians
   * @param {number} aspect Camera aspect ratio. typically viewport width/height
   * @param {number} near Near bound of the frustum
   * @param {number | null} far Far bound of the frustum, can be null or Infinity
   */
  setPerspective(fovy, aspect, near, far) {
    this.fovy = fovy;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  /**
   * Updates view matrix
   */
  updateViewMatrix() {
    mat4.lookAt(this.viewMatrix, this.position, this.lookAt, vec3.fromValues(0, 1, 0));
  }

  /**
   * Updates projection matrix
   */
  updateProjectionMatrix() {
    mat4.perspective(this.projMatrix, this.fovy, this.aspect, this.near, this.far);
  }

  /**
   * Updates view-projection matrix
   */
  updateViewProjectMatrix() {
    this.updateViewMatrix();
    this.updateProjectionMatrix();
    mat4.identity(this.viewProjMatrix);
    mat4.multiply(this.viewProjMatrix, this.viewProjMatrix, this.projMatrix);
    mat4.multiply(this.viewProjMatrix, this.viewProjMatrix, this.viewMatrix);
  }

  /**
   * Gets view-projection matrix
   */
  getViewProjMatrix() {
    return this.viewProjMatrix;
  }
}
