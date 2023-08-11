import { vec4 } from "gl-matrix";
import {
  AttributeTypes,
  BufferAttributeDataType,
  BufferTarget,
  DrawType,
  RenderableObject,
  UniformTypes,
} from "./core/renderable_object.js";
import { ColorMaterial } from "./material/color_material.js";
import { UniformSourceType } from "./material/material.js";

/**
 * @typedef {Object} FrameState
 * @property {number} time Frame time
 * @property {import("./scene").Scene} scene Scene
 */

/**
 * @typedef {Object} RenderObject
 * @property {import("./core/renderable_object").RenderableObject} object Object
 * @property {import("./material/material").Material} material Material instance
 */

/**
 * Cull face side
 * @enum {number}
 */
export const CullFaceSide = {
  None: 0,
  BACK: 1,
  FRONT: 2,
  BOTH: 3,
};

/**
 * @typedef {Object} Options
 * @property {boolean} [enableDepthTest] Enable depth test, default `true`
 * @property {CullFaceSide} [cullFace] Enable cull face, default `true`
 * @property {import("gl-matrix").ReadonlyVec4} [clearColor] WebGl clear color, default `vec4 (0, 0, 0 ,0)`
 */

/**
 * Simple Renderer.
 */
export class Renderer {
  static DefaultMaterial = new ColorMaterial(0.4, 0.4, 1.0, 1.0);

  /**
   * WebGL rendering context
   * @type {WebGL2RenderingContext}
   */
  gl;

  /**
   * @type {boolean}
   */
  enableDepthTest;

  /**
   * @type {CullFaceSide}
   */
  cullFace;

  /**
   * @type {vec4}
   */
  clearColor = vec4.create();

  /**
   * Constructs simple renderer
   * @param {WebGL2RenderingContext} gl
   * @param {Options} [opts]
   */
  constructor(gl, opts = {}) {
    this.gl = gl;

    this.enableDepthTest = opts.enableDepthTest ?? true;
    this.enableCullFace = opts.cullFace ?? CullFaceSide.None;
    vec4.copy(this.clearColor, opts.clearColor ?? vec4.fromValues(0, 0, 0, 0));

    if (this.enableDepthTest) gl.enable(this.gl.DEPTH_TEST);
    switch (this.enableCullFace) {
      case CullFaceSide.None:
        gl.disable(gl.CULL_FACE);
        break;
      case CullFaceSide.BACK:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        break;
      case CullFaceSide.FRONT:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        break;
      case CullFaceSide.BOTH:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT_AND_BACK);
        break;
    }
    gl.clearColor(this.clearColor[0], this.clearColor[1], this.clearColor[2], this.clearColor[3]);
  }

  /**
   * Renders current frame.
   * @param {FrameState} frameState Frame state of current frame
   */
  render(frameState) {
    const gl = this.gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const grouped = this.collectObjectsByMaterials(frameState);

    // render each material group
    grouped.forEach((objects, materialConstructor) => {
      materialConstructor.useProgram(gl);
      const attributes = materialConstructor.getAttributeLocations(gl);
      const uniforms = materialConstructor.getUniformLocations(gl);

      objects.forEach(({ object, material }) => {
        object.glInit(gl);

        // bind uniform data
        uniforms.forEach(({ location, source }, name) => {
          let uniform;
          if (source === UniformSourceType.Material) {
            uniform = material.uniforms.get(name);
          } else {
            uniform = object.uniforms.get(name);
          }
          if (!uniform) {
            console.warn(`unspecified uniform data: ${name}`);
            return;
          }

          switch (uniform.type) {
            case UniformTypes.FloatVector1:
              gl.uniform1fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.FloatVector2:
              gl.uniform2fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.FloatVector3:
              gl.uniform3fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.FloatVector4:
              gl.uniform4fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.IntVector1:
              gl.uniform1iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.IntVector2:
              gl.uniform2iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.IntVector3:
              gl.uniform3iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.IntVector4:
              gl.uniform4iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
              break;
            case UniformTypes.Mat2:
              gl.uniformMatrix2fv(
                location,
                uniform.transpose ?? false,
                uniform.data,
                uniform.srcOffset,
                uniform.srcLength
              );
              break;
            case UniformTypes.Mat3:
              gl.uniformMatrix3fv(
                location,
                uniform.transpose ?? false,
                uniform.data,
                uniform.srcOffset,
                uniform.srcLength
              );
              break;
            case UniformTypes.Mat4:
              gl.uniformMatrix4fv(
                location,
                uniform.transpose ?? false,
                uniform.data,
                uniform.srcOffset,
                uniform.srcLength
              );
              break;
          }
        });

        // bind attribute data
        attributes.forEach((location, name) => {
          const attribute = object.attributes.get(name);
          if (!attribute) {
            console.warn(`unspecified attribute data: ${name}`);
            return;
          }

          switch (attribute.type) {
            case AttributeTypes.Buffer: {
              /**@type {import("./core/renderable_object").BufferAttribute} */
              const { size, offset, stride, normalized, dataType, bufferName } = attribute;
              const buffer = object.buffers.get(bufferName);
              if (!buffer) {
                console.warn(`buffer ${bufferName} not found when binding attribute ${name}`);
                return;
              }

              let type;
              switch (dataType) {
                case BufferAttributeDataType.Byte:
                  type = gl.BYTE;
                  break;
                case BufferAttributeDataType.Float:
                  type = gl.FLOAT;
                  break;
                case BufferAttributeDataType.HalfFloat:
                  type = gl.HALF_FLOAT;
                  break;
                case BufferAttributeDataType.Int:
                  type = gl.INT;
                  break;
                case BufferAttributeDataType.Int_2_10_10_10_Rev:
                  type = gl.INT_2_10_10_10_REV;
                  break;
                case BufferAttributeDataType.Short:
                  type = gl.SHORT;
                  break;
                case BufferAttributeDataType.UnsignedShort:
                  type = gl.UNSIGNED_SHORT;
                  break;
                case BufferAttributeDataType.UnsignedByte:
                  type = gl.UNSIGNED_BYTE;
                  break;
                case BufferAttributeDataType.UnsignedInt:
                  type = gl.UNSIGNED_INT;
                  break;
                case BufferAttributeDataType.UnsignedInt_2_10_10_10_Rev:
                  type = gl.UNSIGNED_INT_2_10_10_10_REV;
                  break;
              }

              gl.bindBuffer(buffer.target, buffer.buffer);
              gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
              gl.enableVertexAttribArray(location);
              gl.bindBuffer(buffer.target, null);
              break;
            }
            case AttributeTypes.FloatVector1:
              gl.vertexAttrib1fv(location, attribute.data);
              break;
            case AttributeTypes.FloatVector2:
              gl.vertexAttrib2fv(location, attribute.data);
              break;
            case AttributeTypes.FloatVector3:
              gl.vertexAttrib3fv(location, attribute.data);
              break;
            case AttributeTypes.FloatVector4:
              gl.vertexAttrib4fv(location, attribute.data);
              break;
            case AttributeTypes.IntVector4:
              gl.vertexAttribI4iv(location, attribute.data);
              break;
            case AttributeTypes.UnsignedIntVector4:
              gl.vertexAttribI4uiv(location, attribute.data);
              break;
          }
        });

        // draw object
        let drawType;
        switch (object.drawType) {
          case DrawType.Points:
            drawType = gl.POINTS;
            break;
          case DrawType.Lines:
            drawType = gl.LINES;
            break;
          case DrawType.LineStrip:
            drawType = gl.LINE_STRIP;
            break;
          case DrawType.LineLoop:
            drawType = gl.LINE_LOOP;
            break;
          case DrawType.Triangles:
            drawType = gl.TRIANGLES;
            break;
          case DrawType.TrianglesFan:
            drawType = gl.TRIANGLE_FAN;
            break;
          case DrawType.TrianglesStrip:
            drawType = gl.TRIANGLE_STRIP;
            break;
        }
        if (object.isIndexed) {
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, object.glIndicesBuffer);
          gl.drawElements(
            drawType,
            object.verticesCount,
            object.indicesType,
            object.verticesOffset
          );
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        } else {
          gl.drawArrays(drawType, object.verticesOffset, object.verticesCount);
        }
      });
    });
  }

  /**
   * Iterates and groups objects by materials
   * @param {FrameState} frameState Frame state of current frame
   * @returns {Map<import("./material/material").MaterialConstructor, RenderObject[]>} Grouped objects
   */
  collectObjectsByMaterials(frameState) {
    /**@type {Map<import("./material/material").MaterialConstructor, RenderObject[]>} */
    const grouped = new Map();

    /**@type {import("./core/transform_object.js").TransformObject[]} */
    const rollings = [frameState.scene.root];
    for (;;) {
      const object = rollings.pop();
      if (!object) break;

      if (frameState.scene.camera.shouldUpdateFrameState || object.shouldUpdateFrameState) {
        object.updateFrameState(frameState);
      }
      rollings.push(...object.children);

      // render only renderable object
      if (object instanceof RenderableObject) {
        const material = object.material ?? Renderer.DefaultMaterial;
        const materialConstructor = material.constructor;
        let list = grouped.get(materialConstructor);
        if (!list) {
          list = [];
          grouped.set(materialConstructor, list);
        }
        list.push({
          object,
          material,
        });
      }
    }

    frameState.scene.camera.shouldUpdateFrameState = false;

    return grouped;
  }
}
