import { vec4 } from "gl-matrix";
import { RenderableObject, UniformTypes } from "../core/renderable_object.js";
import { Material, UniformSourceType, createMaterialProgram } from "./material.js";

export class ColorMaterial extends Material {
  /**
   * @type {string}
   * @private
   */
  static VertexShader = `
    attribute vec4 a_Position;

    uniform mat4 u_MvpMatrix;

    void main() {
      gl_Position = u_MvpMatrix * a_Position;
    }
  `;
  /**
   * @type {string}
   * @private
   */
  static FragmentShader = `
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

  /**
   * @private
   * @type {WebGLProgram}
   */
  static _program;
  /**
   * @private
   * @type {Map<string, number>}
   */
  static _attributeLocations;
  /**
   * @private
   * @type {Map<string, UniformSource>}
   */
  static _uniformLocations;

  /**
   * Uses WebGL program associated with this Material,
   * Shaders and attribute locations and uniform locations should all initialize as well.
   * @param {WebGL2RenderingContext} gl
   * @returns {WebGLProgram}
   */
  static useProgram(gl) {
    if (!ColorMaterial._program) {
      const { program, attributeLocations, uniformLocations } = createMaterialProgram(
        gl,
        [ColorMaterial.VertexShader],
        [ColorMaterial.FragmentShader],
        [RenderableObject.BasicAttributeVariableNames.Position],
        [
          {
            name: RenderableObject.BasicUniformVariableNames.MvpMatrix,
            source: UniformSourceType.Object,
          },
          {
            name: "u_Color",
            source: UniformSourceType.Material,
          },
        ]
      );

      ColorMaterial._program = program;
      ColorMaterial._attributeLocations = attributeLocations;
      ColorMaterial._uniformLocations = uniformLocations;
    }

    gl.useProgram(ColorMaterial._program);
  }

  /**
   * Gets WebGL attribute variable names associated the program
   * @returns {Map<string, number>}
   */
  static getAttributeLocations() {
    return this._attributeLocations;
  }

  /**
   * Gets WebGL uniform variable names associated the program
   * @returns {Map<string, UniformSource>}
   */
  static getUniformLocations() {
    return this._uniformLocations;
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

    this.uniforms.set("u_Color", {
      type: UniformTypes.FloatVector4,
      data: this.color,
    });
  }

  /**
   * Sets color
   * @param {number} r red
   * @param {number} g greed
   * @param {number} b blue
   * @param {number} [a] alpha
   */
  setColor(r, g, b, a) {
    vec4.set(this.color, r, g, b, a);
  }
}
