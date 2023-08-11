/* eslint-disable @typescript-eslint/no-unused-vars */
import { abstractMethod } from "../utils.js";

/**
 * Compile shader
 * @param {WebGL2RenderingContext} gl
 * @param {GLenum} type
 * @param {string} source
 */
const compileShader = (gl, type, source) => {
  // create shader
  const shader = gl.createShader(type);
  // attach source code
  gl.shaderSource(shader, source);
  // compile shader
  gl.compileShader(shader);

  // verify compile status
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    const err = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(err);
  }

  return shader;
};

/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {string[]} vertexSources
 * @param {string[]} fragmentSources
 * @param {string[]} attributeNames
 * @param {{name: string, source: number}[]} uniformNames
 */
export const createMaterialProgram = (
  gl,
  vertexSources,
  fragmentSources,
  attributeNames,
  uniformNames
) => {
  // compile shaders
  const vertexShaders = vertexSources.map((source) => {
    return compileShader(gl, gl.VERTEX_SHADER, source);
  });
  const fragmentShaders = fragmentSources.map((source) => {
    return compileShader(gl, gl.FRAGMENT_SHADER, source);
  });

  // create program, attach shaders and link
  const program = gl.createProgram();
  if (!program) throw new Error("failed to create webgl program");
  [...vertexShaders, ...fragmentShaders].forEach((shader) => {
    gl.attachShader(program, shader);
  });
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const err = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    vertexShaders.forEach((shader) => {
      gl.deleteShader(shader);
    });
    fragmentShaders.forEach((shader) => {
      gl.deleteShader(shader);
    });
    throw new Error(err);
  }

  // gets attribute and uniform locations
  const attributeLocations = new Map();
  attributeNames.forEach((name) => {
    const location = gl.getAttribLocation(program, name);
    if (location < 0) throw new Error(`failed to get attribute location of ${name}`);

    attributeLocations.set(name, location);
  });
  const uniformLocations = new Map();
  uniformNames.forEach(({ name, source }) => {
    const location = gl.getUniformLocation(program, name);
    if (location === null) throw new Error(`failed to get uniform location of ${name}`);

    uniformLocations.set(name, {
      source,
      location,
    });
  });

  return {
    program,
    attributeLocations,
    uniformLocations,
  };
};

/**
 * @typedef {Object} MaterialConstructor
 * @property {(gl: WebGL2RenderingContext) => WebGLProgram} useProgram
 * @property {(gl: WebGL2RenderingContext) => Map<string, number>} getAttributeLocations
 * @property {(gl: WebGL2RenderingContext) => Map<string, UniformSource>} getUniformLocations
 */

/**
 * Uniform source type
 * @enum {number}
 */
export const UniformSourceType = {
  Material: 0,
  Object: 1,
};

/**
 * @typedef {Object} UniformSource
 * @property {UniformSourceType} source Uniform data source type
 * @property {WebGLUniformLocation} location Uniform location
 */

export class Material {
  /**
   * Uses WebGL program associated with this Material,
   * Shaders and attribute locations and uniform locations should all initialize as well.
   * @param {WebGL2RenderingContext} gl
   * @returns {WebGLProgram}
   */
  static useProgram(gl) {
    abstractMethod();
  }

  /**
   * Gets draw type
   * @param {WebGL2RenderingContext} gl
   * @returns {GLenum}
   */
  static getDrawType(gl) {
    abstractMethod();
  }

  /**
   * Gets WebGL attribute variable names associated the program
   * @param {WebGL2RenderingContext} gl
   * @returns {Map<string, number>}
   */
  static getAttributeLocations(gl) {
    abstractMethod();
  }

  /**
   * Gets WebGL uniform variable names associated the program
   * @param {WebGL2RenderingContext} gl
   * @returns {Map<string, UniformSource>}
   */
  static getUniformLocations(gl) {
    abstractMethod();
  }

  /**
   * Uniforms
   * @type {Map<string, import("../core/renderable_object.js").Uniform>}
   * @readonly
   */
  uniforms = new Map();

  /**
   * Sets uniform data
   * @public
   * @param {string} name Uniform variable name
   * @param {Uniform} data Uniform data
   */
  setUniform(name, data) {
    this.uniforms.set(name, data);
  }

  /**
   * Removes uniform data
   * @public
   * @param {string} name Uniform variable name
   */
  removeUniform(name) {
    this.uniforms.delete(name);
  }
}
