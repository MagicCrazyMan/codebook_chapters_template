import { vec4 } from "gl-matrix";
import {
  ArrayAttribute,
  ArrayAttributeType,
  BufferAttribute,
  BufferAttributeDataType,
  ReuseBufferAttribute,
} from "./Attribute.js";
import { UniformType } from "./Uniform.js";
import { RenderEntity } from "./entity/RenderEntity.js";
import { ColorMaterial } from "./material/ColorMaterial.js";
import {
  AttributeBinding,
  DrawMode,
  EntityUniformBinding,
  MainCameraUniformBinding,
  MaterialUniformBinding,
} from "./material/Material.js";

/**
 * @typedef {Object} FrameState
 * @property {number} time Frame time
 * @property {number} previousTime previous frame time
 * @property {import("./Scene.js").Scene} scene Scene
 */

/**
 * @typedef {Object} RenderObject
 * @property {import("./entity/RenderEntity.js").RenderEntity} entity Object
 * @property {import("./material/Material.js").Material} material Material instance
 */

/**
 * Cull face side
 * @enum {number}
 */
export const CullFace = {
  None: 0,
  Back: 1,
  Front: 2,
  Both: 3,
};

/**
 * @typedef {Object} Options
 * @property {boolean} [enableDepthTest] Enable depth test, default `true`
 * @property {CullFace} [cullFace] Enable cull face, default `true`
 * @property {import("gl-matrix").ReadonlyVec4} [clearColor] WebGl clear color, default `vec4 (0, 0, 0 ,0)`
 */

/**
 * Simple WebGL Renderer.
 */
export class WebGLRenderer {
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
   * @type {CullFace}
   */
  cullFace;

  /**
   * @type {vec4}
   */
  clearColor = vec4.create();

  /**
   * @type {BufferPool}
   */
  bufferPool = new BufferPool();

  /**
   * @type {MaterialPool}
   */
  materialPool = new MaterialPool();

  /**
   * Constructs simple renderer
   * @param {WebGL2RenderingContext} gl
   * @param {Options} [opts]
   */
  constructor(gl, opts = {}) {
    this.gl = gl;

    this.enableDepthTest = opts.enableDepthTest ?? true;
    this.enableCullFace = opts.cullFace ?? CullFace.None;
    vec4.copy(this.clearColor, opts.clearColor ?? vec4.fromValues(0, 0, 0, 0));

    if (this.enableDepthTest) gl.enable(this.gl.DEPTH_TEST);
    switch (this.enableCullFace) {
      case CullFace.None:
        gl.disable(gl.CULL_FACE);
        break;
      case CullFace.Back:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        break;
      case CullFace.Front:
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.FRONT);
        break;
      case CullFace.Both:
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

    if (this.enableDepthTest) {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    } else {
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    // collect entities and group them by materials
    const grouped = this.collectEntitiesByMaterials(frameState);
    // render each material group
    grouped.forEach((entities, materialName) => {
      const materialItem = this.materialPool.useMaterial(gl, materialName);

      entities.forEach((entity) => {
        this.setMaterialUniforms(gl, materialItem, entity, frameState);
        this.setMaterialAttributes(gl, materialItem, entity);
        this.drawEntity(gl, materialItem, entity);
      });
    });
  }

  /**
   * Iterates and groups entities by materials
   * @private
   * @param {FrameState} frameState Frame state of current frame
   * @returns {Map<string, RenderEntity[]>} Grouped objects
   */
  collectEntitiesByMaterials(frameState) {
    /**@type {Map<string, RenderObject[]>} */
    const grouped = new Map();

    /**@type {import("./entity/BaseEntity.js").BaseEntity[]} */
    const rollings = [frameState.scene.root];
    for (;;) {
      const entity = rollings.pop();
      if (!entity) break;

      if (frameState.scene.mainCamera.shouldUpdateFrameState || entity.shouldUpdateFrameState) {
        entity.updateFrameState(frameState);
      }
      rollings.push(...entity.children);

      // collect only render entity and the render entity should has some vertices
      if (entity instanceof RenderEntity && entity.verticesCount !== 0) {
        const materialName = entity.material.name();
        let list = grouped.get(materialName);
        if (!list) {
          list = [];
          grouped.set(materialName, list);
        }
        list.push(entity);
      }
    }

    frameState.scene.mainCamera.shouldUpdateFrameState = false;

    return grouped;
  }

  /**
   * @private
   * @param {WebGL2RenderingContext} gl
   * @param {MaterialItem} materialItem
   * @param {RenderEntity} entity
   * @param {FrameState} frameState
   */
  setMaterialUniforms(gl, materialItem, entity, frameState) {
    materialItem.uniforms.forEach(({ location, binding }, name) => {
      /**@type {import("./Uniform.js").ArrayUniform | undefined} */
      let uniform;
      if (binding instanceof MaterialUniformBinding) {
        uniform = entity.material.uniforms.get(name);
      } else if (binding instanceof EntityUniformBinding) {
        uniform = entity.uniforms.get(name);
      } else if (binding instanceof MainCameraUniformBinding) {
        uniform = frameState.scene.mainCamera.uniforms.get(name);
      }

      if (!uniform) {
        console.warn(`unspecified uniform data: ${name}`);
        return;
      }

      switch (binding.type) {
        case UniformType.FloatVector1:
          gl.uniform1fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.FloatVector2:
          gl.uniform2fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.FloatVector3:
          gl.uniform3fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.FloatVector4:
          gl.uniform4fv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.IntVector1:
          gl.uniform1iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.IntVector2:
          gl.uniform2iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.IntVector3:
          gl.uniform3iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.IntVector4:
          gl.uniform4iv(location, uniform.data, uniform.srcOffset, uniform.srcLength);
          break;
        case UniformType.Mat2:
          gl.uniformMatrix2fv(
            location,
            uniform.transpose ?? false,
            uniform.data,
            uniform.srcOffset,
            uniform.srcLength
          );
          break;
        case UniformType.Mat3:
          gl.uniformMatrix3fv(
            location,
            uniform.transpose ?? false,
            uniform.data,
            uniform.srcOffset,
            uniform.srcLength
          );
          break;
        case UniformType.Mat4:
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
  }

  /**
   * @private
   * @param {WebGL2RenderingContext} gl
   * @param {MaterialItem} materialItem
   * @param {RenderEntity} entity
   */
  setMaterialAttributes(gl, materialItem, entity) {
    materialItem.attributes.forEach(({ location }, name) => {
      const attribute = entity.attributes.get(name);
      if (!attribute) {
        console.warn(`unspecified attribute data: ${name}`);
        return;
      }

      if (attribute instanceof BufferAttribute || attribute instanceof ReuseBufferAttribute) {
        if (attribute instanceof BufferAttribute) {
          this.bufferPool.setBuffer(attribute);
        }
        this.bufferPool.bindBuffer(gl, attribute);

        let type;
        switch (attribute.type) {
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

        gl.vertexAttribPointer(
          location,
          attribute.size,
          type,
          attribute.normalized,
          attribute.stride,
          attribute.offset
        );
        gl.enableVertexAttribArray(location);

        this.bufferPool.unbindBuffer(gl, attribute);
      } else if (attribute instanceof ArrayAttribute) {
        switch (attribute.type) {
          case ArrayAttributeType.FloatVector1:
            gl.vertexAttrib1fv(location, attribute.data);
            break;
          case ArrayAttributeType.FloatVector2:
            gl.vertexAttrib2fv(location, attribute.data);
            break;
          case ArrayAttributeType.FloatVector3:
            gl.vertexAttrib3fv(location, attribute.data);
            break;
          case ArrayAttributeType.FloatVector4:
            gl.vertexAttrib4fv(location, attribute.data);
            break;
          case ArrayAttributeType.IntVector4:
            gl.vertexAttribI4iv(location, attribute.data);
            break;
          case ArrayAttributeType.UnsignedIntVector4:
            gl.vertexAttribI4uiv(location, attribute.data);
            break;
        }
      }
    });
  }

  /**
   * @private
   * @param {WebGL2RenderingContext} gl
   * @param {MaterialItem} materialItem
   * @param {RenderEntity} entity
   */
  drawEntity(gl, materialItem, entity) {
    let mode;
    switch (materialItem.drawMode) {
      case DrawMode.Points:
        mode = gl.POINTS;
        break;
      case DrawMode.Lines:
        mode = gl.LINES;
        break;
      case DrawMode.LineStrip:
        mode = gl.LINE_STRIP;
        break;
      case DrawMode.LineLoop:
        mode = gl.LINE_LOOP;
        break;
      case DrawMode.Triangles:
        mode = gl.TRIANGLES;
        break;
      case DrawMode.TrianglesFan:
        mode = gl.TRIANGLE_FAN;
        break;
      case DrawMode.TrianglesStrip:
        mode = gl.TRIANGLE_STRIP;
        break;
    }
    gl.drawArrays(mode, entity.verticesOffset, entity.verticesCount);
  }
}

/**
 * Buffer usages, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferUsage = {
  StaticDraw: 0,
  DynamicDraw: 1,
  StreamDraw: 2,
  StaticRead: 3,
  DynamicRead: 4,
  StreamRead: 5,
  StaticCopy: 6,
  DynamicCopy: 7,
  StreamCopy: 8,
};

/**
 * Buffer targets, mapping to WebGL enums.
 * @enum {number}
 */
export const BufferTarget = {
  ArrayBuffer: 0,
  ElementArrayBuffer: 1,
  CopyReadBuffer: 2,
  CopyWriteBuffer: 3,
  TransformFeedbackBuffer: 4,
  UniformBUffer: 5,
  PixelPackBuffer: 6,
  PixelUnpackBuffer: 7,
};

/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {BufferTarget} target
 * @returns {GLenum}
 */
const getWebGLBufferTarget = (gl, target) => {
  switch (target) {
    case BufferTarget.ArrayBuffer:
      return gl.ARRAY_BUFFER;
    case BufferTarget.CopyReadBuffer:
      return gl.COPY_READ_BUFFER;
    case BufferTarget.CopyWriteBuffer:
      return gl.COPY_WRITE_BUFFER;
    case BufferTarget.ElementArrayBuffer:
      return gl.ELEMENT_ARRAY_BUFFER;
    case BufferTarget.PixelPackBuffer:
      return gl.PIXEL_PACK_BUFFER;
    case BufferTarget.PixelUnpackBuffer:
      return gl.PIXEL_PACK_BUFFER;
    case BufferTarget.TransformFeedbackBuffer:
      return gl.TRANSFORM_FEEDBACK_BUFFER;
    case BufferTarget.UniformBUffer:
      return gl.UNIFORM_BUFFER;
    default:
      throw new Error(`unknown WebGL buffer target ${target}`);
  }
};
/**
 *
 * @param {WebGL2RenderingContext} gl
 * @param {BufferTarget} usage
 * @returns {GLenum}
 */
const getWebGLBufferUsage = (gl, usage) => {
  switch (usage) {
    case BufferUsage.DynamicCopy:
      return gl.DYNAMIC_COPY;
    case BufferUsage.DynamicDraw:
      return gl.DYNAMIC_DRAW;
    case BufferUsage.DynamicRead:
      return gl.DYNAMIC_READ;
    case BufferUsage.StaticCopy:
      return gl.STATIC_COPY;
    case BufferUsage.StaticDraw:
      return gl.STATIC_DRAW;
    case BufferUsage.StaticRead:
      return gl.STATIC_READ;
    case BufferUsage.StreamCopy:
      return gl.STREAM_COPY;
    case BufferUsage.StreamDraw:
      return gl.STREAM_DRAW;
    case BufferUsage.StreamRead:
      return gl.STREAM_READ;
    default:
      throw new Error(`unknown WebGL buffer usage ${usage}`);
  }
};

class BufferItem {
  /**
   * @type {WebGLBuffer | undefined}
   * @readonly
   */
  buffer;

  /**
   * @type {boolean}
   * @readonly
   */
  buffered;
}

class BufferPool {
  /**
   * @type {WeakMap<BufferAttribute | ReuseBufferAttribute, BufferItem>}
   */
  pool = new WeakMap();

  /**
   * Tries to get buffer cache, throws error if not found
   * @private
   * @param {BufferAttribute | ReuseBufferAttribute} attribute
   * @returns {BufferItem}
   */
  tryBuffer(attribute) {
    const bufferCache = this.pool.get(attribute);
    if (!bufferCache) throw new Error(`buffer ${attribute.bufferName} not found`);
  }

  /**
   * Adds a new buffer
   * @param {BufferAttribute | ReuseBufferAttribute} attribute
   */
  setBuffer(attribute) {
    const buffer = this.pool.getBuffer(attribute);
    if (buffer) return;

    if (attribute instanceof BufferAttribute) {
      this.pool.set(attribute, new BufferItem());
    } else if (attribute instanceof ReuseBufferAttribute) {
      this.pool.get;
    }
  }

  /**
   * Binds a buffer
   * @param {WebGL2RenderingContext} gl
   * @param {BufferAttribute | ReuseBufferAttribute} attribute
   */
  bindBuffer(gl, attribute) {
    const bufferItem = this.tryBuffer(attribute);

    const target = getWebGLBufferTarget(gl, attribute.target);
    if (!bufferItem.buffered) {
      // if not buffered, bind and buffer data
      const buffer = gl.createBuffer();
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, attribute.data, getWebGLBufferUsage(gl, attribute.usage));
      bufferItem.buffer = buffer;
    } else if (attribute.updated) {
      // if updated,
      // check whether current webgl buffer has enough size to store new data.
      // If true, reuse the WebGL buffer
      gl.bindBuffer(target, bufferItem.buffer);
      const currentBufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
      if (currentBufferSize >= bufferItem.data.byteLength) {
        gl.bufferSubData(target, 0, bufferItem.data);
      } else {
        gl.bufferData(target, attribute.data, getWebGLBufferUsage(gl, attribute.usage));
      }
    } else {
      // if buffered, bind buffer only
      gl.bindBuffer(target, bufferItem.buffer);
    }

    bufferItem.updated = false;
    bufferItem.buffered = true;
  }

  /**
   * Unbinds a buffer
   * @param {WebGL2RenderingContext} gl
   * @param {BufferAttribute} attribute
   */
  unbindBuffer(gl, attribute) {
    gl.bindBuffer(getWebGLBufferTarget(gl, attribute.target), null);
  }
}

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

class MaterialAttribute {
  /**
   * @type {number}
   */
  location;
  /**
   * @type {AttributeBinding}
   */
  binding;

  /**
   *
   * @param {number} location
   * @param {AttributeBinding} binding
   */
  constructor(location, binding) {
    this.location = location;
    this.binding = binding;
  }
}

class MaterialUniform {
  /**
   * @type {WebGLUniformLocation}
   */
  location;
  /**
   * @type {MaterialUniformBinding | EntityUniformBinding | MainCameraUniformBinding}
   */
  binding;

  /**
   *
   * @param {WebGLUniformLocation} location
   * @param {MaterialUniformBinding | EntityUniformBinding | MainCameraUniformBinding} binding
   */
  constructor(location, binding) {
    this.location = location;
    this.binding = binding;
  }
}

class MaterialItem {
  /**
   * @type {string}
   */
  vertexShaderSource;
  /**
   * @type {string}
   */
  fragmentShaderSource;
  /**
   * @type {import("./material/Material.js").AttributeBinding[]}
   */
  attributesBindings;
  /**
   * @type {import("./material/Material.js").UniformBinding[]}
   */
  uniformBindings;
  /**
   * @type {import("./material/Material.js").DrawMode}
   */
  drawMode;

  /**
   * @type {WebGLProgram | undefined}
   */
  program;
  /**
   * @type {Map<string, MaterialAttribute>}
   */
  attributes = new Map();
  /**
   * @type {Map<string, MaterialUniform>}
   */
  uniforms = new Map();
  /**
   * @type {boolean}
   */
  compiled = false;

  /**
   *
   * @param {import("./material/Material.js").Material} material
   */
  constructor(material) {
    this.vertexShaderSource = material.vertexShaderSource();
    this.fragmentShaderSource = material.fragmentShaderSource();
    this.attributesBindings = material.attributesBindings();
    this.uniformBindings = material.uniformBindings();
    this.drawMode = material.drawMode();
  }

  /**
   * Compile material
   * @param {WebGL2RenderingContext} gl
   */
  compile(gl) {
    // compile shaders
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, this.vertexShaderSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, this.fragmentShaderSource);

    // create program, attach shaders and link
    const program = gl.createProgram();
    if (!program) throw new Error("failed to create webgl program");
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      throw new Error(gl.getProgramInfoLog(program));
    }

    // gets attribute and uniform locations
    this.attributesBindings.forEach((binding) => {
      const location = gl.getAttribLocation(program, binding.name);
      if (location < 0) throw new Error(`failed to get attribute location of ${binding.name}`);

      this.attributes.set(name, new MaterialAttribute(location, binding));
    });
    this.uniformBindings.forEach((binding) => {
      const location = gl.getUniformLocation(program, binding.name);
      if (location === null) throw new Error(`failed to get uniform location of ${binding.name}`);

      this.uniforms.set(name, new MaterialUniform(location, binding));
    });

    this.program = program;
  }
}

class MaterialPool {
  /**
   * @type {Map<string, MaterialItem>}
   */
  materials = new Map();

  /**
   * Sets a new material.
   * @param {string} name
   * @returns {MaterialItem | undefined}
   */
  getMaterial(name) {
    this.materials.get(name);
  }

  /**
   * Sets a new material.
   * @param {import("./material/Material.js").Material} material
   */
  setMaterial(material) {
    const name = material.name();
    if (this.materials.has(name)) throw new Error(`material ${name} already existing`);

    this.materials.set(name, new MaterialItem(material));
  }

  /**
   * Remove an existing material
   * @param {string} name
   */
  deleteMaterial(name) {
    this.materials.delete(name);
  }

  /**
   * Uses an existing material
   * @param {WebGL2RenderingContext} gl
   * @param {string} name
   */
  useMaterial(gl, name) {
    const material = this.materials.get(name);
    if (!material) throw new Error(`material ${name} not found`);

    if (!material.compiled) {
      material.compile(gl);
    }

    gl.useProgram(material.program);

    return material;
  }
}
