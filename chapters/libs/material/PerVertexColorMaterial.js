import { BufferAttribute, BufferDescriptor } from "../Attribute.js";
import { EntityAttributeNames, EntityUniformNames } from "../entity/RenderEntity.js";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialAttributeBinding,
} from "./Material.js";

export class PerVertexColorMaterial extends Material {
  /**
   * Returns name of this material.
   * @returns {string}
   */
  name() {
    return "PerVertexColorMaterial";
  }
  /**
   * Returns vertex shader source for WebGL program.
   * @returns {string}
   */
  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Color;

      uniform mat4 u_MvpMatrix;

      varying vec4 v_Color;

      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Color = a_Color;
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

      varying vec4 v_Color;

      void main() {
        gl_FragColor = v_Color;
      }
    `;
  }

  /**
   * Returns attribute bindings for WebGL program.
   * @returns {EntityAttributeBinding[]}
   */
  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new MaterialAttributeBinding("a_Color"),
    ];
  }

  /**
   * Returns uniform bindings for WebGL program.
   * @returns {EntityUniformBinding[]}
   */
  uniformBindings() {
    return [new EntityUniformBinding(EntityUniformNames.MvpMatrix)];
  }

  /**
   * Color
   * @type {Float32Array}
   * @readonly
   */
  colors;

  /**
   * Color component size
   * @type {number}
   * @readonly
   */
  size;

  /**
   * Constructs a static per vertex color material
   * @param {Float32Array} colors Colors per vertex
   * @param {number} [size] Color component size
   */
  constructor(colors, size = 3) {
    super();
    this.setColor(colors, size);
  }

  /**
   * Sets colors
   * @param {Float32Array} colors colors per vertex
   * @param {number} [size] Color component size
   */
  setColor(colors, size = 3) {
    this.colors = colors;
    this.size = size;
    this.attributes.set("a_Color", new BufferAttribute(new BufferDescriptor(this.colors), this.size));
  }
}
