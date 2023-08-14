import { mat4, quat, vec3 } from "gl-matrix";
import { v4 } from "uuid";
import { fromRadians } from "../Utils.js";

export class ObjectFrameEvent extends Event {
  /**
   * object
   * @readonly
   * @type {BaseEntity}
   */
  object;

  /**
   * object
   * @readonly
   * @type {import("../WebGLRenderer.js").FrameState}
   */
  frameState;

  /**
   * Object event
   * @param {string} type
   * @param {BaseEntity} object
   * @param {import("../WebGLRenderer.js").FrameState} frameState
   */
  constructor(type, object, frameState) {
    super(type);
    this.object = object;
    this.frameState = frameState;
  }
}

/**
 * @typedef {Object} Options Renderable object options
 * @property {string} [name] Object name
 * @property {import("gl-matrix").ReadonlyVec3} [translation] Object translation
 * @property {import("gl-matrix").ReadonlyVec3} [rotation] Object rotation
 * @property {import("gl-matrix").ReadonlyVec3} [scaling] Object scale
 */

/**
 * A basic object providing local position, world transformation and etc.
 * @abstract
 */
export class BaseEntity {
  /**
   * Entity name
   * @type {string}
   * @readonly
   */
  name;

  /**
   * Translation of the entity.
   * @type {vec3}
   * @readonly
   */
  translation = vec3.create();

  /**
   * Rotation in quaternion of the entity.
   * @type {quat}
   * @readonly
   */
  rotationQuaternion = quat.create();

  /**
   * Scaling of the entity.
   * @type {vec3}
   * @readonly
   */
  scaling = vec3.fromValues(1, 1, 1);

  /**
   * Model matrix of the entity.
   * @type {mat4}
   * @readonly
   */
  modelMatrix = mat4.create();

  /**
   * Should this object updates frame state before rendering.
   * @type {boolean}
   * @readonly
   */
  shouldUpdateFrameState = true;

  /**
   * Composed model matrix of the entity in tree in last render frame.
   * @readonly
   */
  composedModelMatrix = mat4.create();

  /**
   * Composed normal matrix of the entity in tree in last render frame.
   * @type {mat4}
   * @readonly
   */
  composedNormalMatrix = mat4.create();

  /**
   * Composed Model-View-Projection matrix of the entity in tree in last render frame.
   * @readonly
   */
  composedMvpMatrix = mat4.create();

  /**
   * Parent object.
   * @type {BaseEntity | null}
   * @readonly
   */
  parent = null;

  /**
   * Children objects.
   * @type {BaseEntity[]}
   * @readonly
   */
  children = [];

  /**
   * Object event
   *  - `beforeUpdateFrameState`
   *  - `afterUpdateFrameState`
   * @readonly
   */
  event = new EventTarget();

  /**
   * Constructs a new basic object.
   * @param {Options} [opts] Options
   */
  constructor(opts = {}) {
    this.setName(opts.name || v4());
    if (opts.translation) this.setTranslation(opts.translation);
    if (opts.rotation) this.setRotation(opts.rotation);
    if (opts.scaling) this.setScaling(opts.scaling);

    this.updateModelMatrix();
  }

  /**
   * Sets object name.
   * @public
   * @param {import("gl-matrix").ReadonlyVec3} name Object name
   */
  setName(name) {
    if (!name) return;
    this.name = name;
  }

  /**
   * Sets object translation.
   * @public
   * @param {import("gl-matrix").ReadonlyVec3} translation Object translation
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setTranslation(translation, update = false) {
    vec3.copy(this.translation, translation);

    if (update) this.updateModelMatrix();
  }

  /**
   * Sets object rotation.
   * @public
   * @param {import("gl-matrix").ReadonlyVec3} rotation Object rotation
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setRotation(rotation, update = false) {
    quat.fromEuler(
      this.rotationQuaternion,
      fromRadians(rotation[0]),
      fromRadians(rotation[1]),
      fromRadians(rotation[2])
    );

    if (update) this.updateModelMatrix();
  }

  /**
   * Sets object rotation.
   * @public
   * @param {import("gl-matrix").ReadonlyQuat} rotation Object rotation in quaternion
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setRotationQuaternion(rotation, update = false) {
    quat.copy(this.rotationQuaternion, rotation);

    if (update) this.updateModelMatrix();
  }

  /**
   * Sets object scale.
   * @public
   * @param {import("gl-matrix").ReadonlyVec3} scaling Object scale
   * @param {boolean} [update] Recalculates matrices immediately, default `false`
   */
  setScaling(scaling, update = false) {
    vec3.copy(this.scaling, scaling);

    if (update) this.updateModelMatrix();
  }

  /**
   * Sets custom model matrix
   * @public
   * @param {import("gl-matrix").ReadonlyMat4} modelMatrix Custom object matrix.
   */
  setModelMatrix(modelMatrix) {
    mat4.copy(this.modelMatrix, modelMatrix);
    mat4.getTranslation(this.translation, modelMatrix);
    mat4.getRotation(this.rotationQuaternion, modelMatrix);
    mat4.getScaling(this.scaling, modelMatrix);
    this.shouldUpdateFrameState = true;
  }

  /**
   * Updates model matrix.
   * @public
   */
  updateModelMatrix() {
    mat4.fromRotationTranslationScale(
      this.modelMatrix,
      this.rotationQuaternion,
      this.translation,
      this.scaling
    );
    this.shouldUpdateFrameState = true;
  }

  /**
   * Update frame state.
   * @public
   * @param {import("../WebGLRenderer.js").FrameState} frameState frame state
   */
  updateFrameState(frameState) {
    this.event.dispatchEvent(new ObjectFrameEvent("beforeUpdateFrameState", this, frameState));

    if (this.parent) {
      mat4.mul(this.composedModelMatrix, this.parent.composedModelMatrix, this.modelMatrix);
    } else {
      mat4.copy(this.composedModelMatrix, this.modelMatrix);
    }
    mat4.mul(
      this.composedMvpMatrix,
      frameState.scene.mainCamera.viewProjectionMatrix,
      this.composedModelMatrix
    );

    // normal matrix
    mat4.invert(this.composedNormalMatrix, this.composedModelMatrix);
    mat4.transpose(this.composedNormalMatrix, this.composedNormalMatrix);

    this.shouldUpdateFrameState = false;

    this.event.dispatchEvent(new ObjectFrameEvent("beforeUpdateFrameState", this, frameState));

    // update children
    this.children.forEach((child) => {
      child.updateFrameState(frameState);
    });
  }

  /**
   * Add child object to this object.
   * @param {BaseEntity} child Child object
   */
  addChild(child) {
    if (child.parent) {
      child.parent.removeChild(child.name);
    }

    child.parent = this;
    this.children.push(child);
  }

  /**
   * Remove child from children by object name
   * @param {string} name Object name
   */
  removeChild(name) {
    const index = this.children.findIndex((child) => child.name === name);
    if (index === -1) return;
    const child = this.children.splice(index, 1)[0];
    child.parent = null;
  }
}
