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
   * @param {vec3} position
   * @param {vec3} lookAt
   * @param {number} fovy
   * @param {number} aspect
   * @param {number} near
   * @param {number} far
   */
  constructor(position, lookAt, fovy, aspect, near, far) {
    this.setView(position, lookAt);
    this.setPerspective(fovy, aspect, near, far);
    this.updateViewProjectMatrix();
  }

  /**
   *
   * @param {vec3} position
   * @param {vec3} lookAt
   */
  setView(position, lookAt) {
    this.position.set(position);
    this.lookAt.set(lookAt);
  }

  /**
   *
   * @param {number} fovy
   * @param {number} aspect
   * @param {number} near
   * @param {number} far
   */
  setPerspective(fovy, aspect, near, far) {
    this.fovy = fovy;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
  }

  updateViewMatrix() {
    mat4.lookAt(this.viewMatrix, this.position, this.lookAt, vec3.fromValues(0, 1, 0));
  }

  updateProjectionMatrix() {
    mat4.perspective(this.projMatrix, this.fovy, this.aspect, this.near, this.far);
  }

  updateViewProjectMatrix() {
    this.updateViewMatrix();
    this.updateProjectionMatrix();
    mat4.identity(this.viewProjMatrix);
    mat4.multiply(this.viewProjMatrix, this.viewProjMatrix, this.projMatrix);
    mat4.multiply(this.viewProjMatrix, this.viewProjMatrix, this.viewMatrix);
  }

  getViewProjMatrix() {
    return this.viewProjMatrix;
  }
}
