/* eslint-disable @typescript-eslint/no-unused-vars */
import { abstractMethod } from "../Utils.js";

/**
 * Material attribute binding requiring data from entity.
 */
export class EntityAttributeBinding {
  /**
   * @type {string}
   */
  name;

  /**
   *
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

/**
 * Material attribute binding requiring data from material.
 */
export class MaterialAttributeBinding {
  /**
   * @type {string}
   */
  name;

  /**
   *
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

/**
 * Material uniform binding requiring data from material.
 */
export class MaterialUniformBinding {
  /**
   * @type {string}
   */
  name;

  /**
   *
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

/**
 * Material uniform binding requiring data from entity.
 */
export class EntityUniformBinding {
  /**
   * @type {string}
   */
  name;

  /**
   *
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

/**
 * Material uniform binding requiring data from main camera.
 */
export class MainCameraUniformBinding {
  /**
   * @type {string}
   */
  name;

  /**
   *
   * @param {string} name
   */
  constructor(name) {
    this.name = name;
  }
}

/**
 * Abstract material
 * @abstract
 */
export class Material {
  /**
   * Returns name of this material.
   * @returns {string}
   */
  name() {
    abstractMethod();
  }
  /**
   * Returns vertex shader source for WebGL program.
   * @returns {string}
   */
  vertexShaderSource() {
    abstractMethod();
  }

  /**
   * Returns fragment shader source for WebGL program.
   * @returns {string}
   */
  fragmentShaderSource() {
    abstractMethod();
  }

  /**
   * Returns attribute bindings for WebGL program.
   * @returns {EntityAttributeBinding[]}
   */
  attributesBindings() {
    abstractMethod();
  }

  /**
   * Returns uniform bindings for WebGL program.
   * @returns {MainCameraUniformBinding[] | EntityUniformBinding[] | MaterialUniformBinding[]}
   */
  uniformBindings() {
    abstractMethod();
  }

  /**
   * Returns draw mode of this material.
   *
   * If not specified, use draw mode defined in render entity
   * @returns {import("../Constants.js").DrawMode | undefined}
   */
  drawMode() {
    return void 0;
  }

  /**
   * Attributes
   * @type {Map<string, import("../Attribute.js").BufferAttribute | import("../Attribute.js").ArrayAttribute>}
   * @readonly
   */
  attributes = new Map();

  /**
   * Uniforms
   * @type {Map<string, import("../Uniform.js").Uniform>}
   * @readonly
   */
  uniforms = new Map();

  /**
   * Updates material before rendering.
   *
   * If material never change, left this method empty.
   * @param {import("../entity/RenderEntity.js").RenderEntity} entity
   * @param {import("../WebGLRenderer.js").FrameState} frameState
   */
  prerender(entity, frameState) {
    //
  }
}
