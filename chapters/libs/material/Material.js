/* eslint-disable @typescript-eslint/no-unused-vars */
import { abstractMethod } from "../Utils.js";

/**
 * Material binding.
 */
export class MaterialBinding {
  /**
   * @type {string}
   */
  name;

  /**
   * Logs warning message if no data bind
   * @type {boolean}
   */
  warning;

  /**
   * Constructs entity attribute binding.
   * @param {string} name
   * @param {boolean} [warning]
   */
  constructor(name, warning = true) {
    this.name = name;
    this.warning = warning;
  }
}

/**
 * Material attribute binding requiring data from entity.
 */
export class EntityAttributeBinding extends MaterialBinding {}

/**
 * Material attribute binding requiring data from material.
 */
export class MaterialAttributeBinding extends MaterialBinding {}

/**
 * Material uniform binding requiring data from entity.
 */
export class EntityUniformBinding extends MaterialBinding {}

/**
 * Material uniform binding requiring data from main camera.
 */
export class MainCameraUniformBinding extends MaterialBinding {}

/**
 * Material uniform binding requiring data from material.
 */
export class MaterialUniformBinding extends MaterialBinding {}

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
   * @param {Map<string, import("../WebGLRenderer.js").MaterialAttribute>} attributes
   * @param {Map<string, import("../WebGLRenderer.js").MaterialUniform>} uniforms
   * @param {import("../WebGLRenderer.js").FrameState} frameState
   */
  prerender(entity, attributes, uniforms, frameState) {
    //
  }

  /**
   * Updates material after rendering.
   *
   * If material never change, left this method empty.
   * @param {import("../entity/RenderEntity.js").RenderEntity} entity
   * @param {Map<string, import("../WebGLRenderer.js").MaterialAttribute>} attributes
   * @param {Map<string, import("../WebGLRenderer.js").MaterialUniform>} uniforms
   * @param {import("../WebGLRenderer.js").FrameState} frameState
   */
  postrender(entity, attributes, uniforms, frameState) {
    //
  }
}
