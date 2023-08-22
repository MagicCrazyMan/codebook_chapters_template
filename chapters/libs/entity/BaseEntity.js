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
   * Composed Model-View matrix of the entity in tree in last render frame.
   * @readonly
   */
  composedMvMatrix = mat4.create();

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

    mat4.fromRotationTranslationScale(
      this.modelMatrix,
      quat.fromEuler(
        quat.create(),
        fromRadians(opts.rotation?.[0] ?? 0),
        fromRadians(opts.rotation?.[1] ?? 0),
        fromRadians(opts.rotation?.[2] ?? 0)
      ),
      opts.translation ?? vec3.fromValues(0, 0, 0),
      opts.scaling ?? vec3.fromValues(1, 1, 1)
    );
    this.shouldUpdateFrameState = true;
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
   * Updates model matrix.
   * @public
   * @param {import("gl-matrix").ReadonlyMat4} modelMatrix
   */
  setModelMatrix(modelMatrix) {
    mat4.copy(this.modelMatrix, modelMatrix)
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
      this.composedMvMatrix,
      frameState.scene.mainCamera.viewMatrix,
      this.composedModelMatrix
    );
    mat4.mul(
      this.composedMvpMatrix,
      frameState.scene.mainCamera.projectionMatrix,
      this.composedMvMatrix
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
