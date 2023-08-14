/* eslint-disable @typescript-eslint/no-unused-vars */
import { ArrayAttribute, BufferAttribute, ReuseBufferAttribute } from "../Attribute.js";
import { ArrayUniform, UniformType } from "../Uniform.js";
import { BaseEntity } from "./BaseEntity.js";

/**
 * @typedef {Object} Options Render entity options
 * @property {string} [name] Entity name
 * @property {number} [verticesCount] Vertices count
 * @property {number} [verticesOffset] Vertices offset
 * @property {import("../material/material.js").Material} [material] Material
 * @property {import("gl-matrix").ReadonlyVec3} [translation] Geometry translation
 * @property {import("gl-matrix").ReadonlyVec3} [rotation] Geometry rotation
 * @property {import("gl-matrix").ReadonlyVec3} [scaling] Geometry scale
 */

/**
 * @enum {string}
 */
export const EntityAttributeNames = {
  Position: "a_Position",
  Normal: "a_Normal",
  TexCoord: "a_TexCoord",
};

/**
 * @enum {string}
 */
export const EntityUniformNames = {
  ModelMatrix: "u_ModelMatrix",
  NormalMatrix: "u_NormalMatrix",
  MvpMatrix: "u_MvpMatrix",
};

/**
 * Abstract entity for rendering.
 * @abstract
 */
export class RenderEntity extends BaseEntity {
  /**
   * Attributes
   * @type {Map<string, ArrayAttribute | BufferAttribute | ReuseBufferAttribute>}
   * @readonly
   */
  attributes = new Map();

  /**
   * Uniforms
   * @type {Map<string, ArrayUniform>}
   * @readonly
   */
  uniforms = new Map();

  /**
   * Vertices count
   * @type {number}
   */
  verticesCount;

  /**
   * Vertex offset
   * @type {number}
   */
  verticesOffset;

  /**
   * Material
   * @type {import("../material/Material.js").Material | undefined}
   */
  material;

  /**
   * Constructs a new render entity.
   * @param {Options} [opts] Options
   */
  constructor(opts = {}) {
    super(opts.translation, opts.rotation, opts.scaling);
    this.verticesCount = opts.verticesCount ?? 0;
    this.verticesOffset = opts.verticesOffset ?? 0;
    this.material = opts.material;

    this.uniforms.set(
      EntityUniformNames.ModelMatrix,
      new ArrayUniform(UniformType.Mat4, this.composedModelMatrix)
    );
    this.uniforms.set(
      EntityUniformNames.NormalMatrix,
      new ArrayUniform(UniformType.Mat4, this.composedNormalMatrix)
    );
    this.uniforms.set(
      EntityUniformNames.MvpMatrix,
      new ArrayUniform(UniformType.Mat4, this.composedMvpMatrix)
    );
  }
}
