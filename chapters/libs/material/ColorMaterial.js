import { vec4 } from "gl-matrix";
import { UniformType } from "../Constants.js";
import { Uniform } from "../Uniform.js";
import { EntityAttributeNames, EntityUniformNames } from "../entity/RenderEntity.js";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialUniformBinding,
} from "./Material.js";

export class ColorMaterial extends Material {
  /**
   * Returns name of this material.
   * @returns {string}
   */
  name() {
    return "ColorMaterial";
  }
  /**
   * Returns vertex shader source for WebGL program.
   * @returns {string}
   */
  vertexShaderSource() {
    return `
      attribute vec4 a_Position;

      uniform mat4 u_MvpMatrix;

      void main() {
        gl_Position = u_MvpMatrix * a_Position;
      }
    `;
  }

  /**
   * Returns fragment shader source for WebGL program.
   * @returns {string}
   */
  fragmentShaderSource() {
    return `
      #ifdef GL_FRAGMENT_PRECISION_HIGH
        precision highp float;
      #else
        precision mediump float;
      #endif

      uniform vec4 u_Color;

      void main() {
        gl_FragColor = u_Color;
      }
    `;
  }

  /**
   * Returns attribute bindings for WebGL program.
   * @returns {EntityAttributeBinding[]}
   */
  attributesBindings() {
    return [new EntityAttributeBinding(EntityAttributeNames.Position)];
  }

  /**
   * Returns uniform bindings for WebGL program.
   * @returns {EntityUniformBinding[]}
   */
  uniformBindings() {
    return [
      new MaterialUniformBinding("u_Color"),
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
    ];
  }

  /**
   * Color
   * @type {vec4}
   * @readonly
   */
  color = vec4.create();

  /**
   * Constructs a static color material
   * @param {number} r red
   * @param {number} g greed
   * @param {number} b blue
   * @param {number} [a] alpha
   */
  constructor(r, g, b, a) {
    super();
    this.setColor(r, g, b, a);

    this.uniforms.set("u_Color", new Uniform(UniformType.FloatVector4, this.color));
  }

  /**
   * Sets color
   * @param {number} r red
   * @param {number} g greed
   * @param {number} b blue
   * @param {number} [a] alpha
   */
  setColor(r, g, b, a) {
    vec4.set(this.color, r, g, b, a ?? 1);
  }
}
