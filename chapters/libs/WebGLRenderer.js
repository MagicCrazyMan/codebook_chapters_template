import { vec4 } from "gl-matrix";
import { ArrayAttribute, BufferAttribute } from "./Attribute.js";
import {
  ArrayAttributeType,
  UniformType,
  glBufferAttributeDataType,
  glBufferTarget,
  glBufferUsage,
  glDrawMode,
} from "./Constants.js";
import { RenderEntity } from "./entity/RenderEntity.js";
import { ColorMaterial } from "./material/ColorMaterial.js";
import {
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
   * @type {WebGLProgram | undefined}
   * @private
   */
  lastProgram;

  /**
   * Constructs simple renderer
   * @param {WebGL2RenderingContext} gl
   * @param {Options} [opts]
   */
  constructor(gl, opts = {}) {
    this.gl = gl;

    this.enableDepthTest = opts.enableDepthTest ?? true;
    this.cullFace = opts.cullFace ?? CullFace.None;
    vec4.copy(this.clearColor, opts.clearColor ?? vec4.fromValues(0, 0, 0, 0));

    if (this.enableDepthTest) gl.enable(this.gl.DEPTH_TEST);
    switch (this.cullFace) {
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
      // use material, all entities in the same group use the same program
      const materialItem = this.materialPool.getMaterial(gl, materialName);
      if (this.lastProgram !== materialItem.program) {
        gl.useProgram(materialItem.program);
        this.lastProgram = materialItem.program;
      }

      entities.forEach((entity) => {
        const material = entity.material ?? WebGLRenderer.DefaultMaterial;
        material.prerender(entity, frameState);
        
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
        const material = entity.material ?? WebGLRenderer.DefaultMaterial;
        this.materialPool.setMaterial(material);

        let entities = grouped.get(material.name());
        if (!entities) {
          entities = [];
          grouped.set(material.name(), entities);
        }

        entities.push(entity);
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
      /**@type {import("./Uniform.js").Uniform | undefined} */
      let uniform;
      if (binding instanceof MaterialUniformBinding) {
        const material = entity.material ?? WebGLRenderer.DefaultMaterial;
        uniform = material.uniforms.get(name);
      } else if (binding instanceof EntityUniformBinding) {
        uniform = entity.uniforms.get(name);
      } else if (binding instanceof MainCameraUniformBinding) {
        uniform = frameState.scene.mainCamera.uniforms.get(name);
      }

      if (!uniform) {
        console.warn(`unspecified uniform data: ${name}`);
        return;
      }

      switch (uniform.type) {
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

      if (attribute instanceof BufferAttribute) {
        this.bufferPool.setBuffer(attribute.descriptor);
        this.bufferPool.bindBuffer(gl, attribute.descriptor);

        gl.vertexAttribPointer(
          location,
          attribute.size,
          glBufferAttributeDataType(gl, attribute.descriptor.type),
          attribute.normalized,
          attribute.stride,
          attribute.offset
        );
        gl.enableVertexAttribArray(location);

        this.bufferPool.unbindBuffer(gl, attribute.descriptor);
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
    gl.drawArrays(
      glDrawMode(gl, materialItem.drawMode),
      entity.verticesOffset,
      entity.verticesCount
    );
  }
}

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
   * @type {WeakMap<import("./Attribute.js").BufferDescriptor, BufferItem>}
   */
  pool = new WeakMap();

  /**
   * Adds a new buffer
   * @param {import("./Attribute.js").BufferDescriptor} descriptor
   */
  setBuffer(descriptor) {
    const buffer = this.pool.get(descriptor);
    if (buffer) return;

    this.pool.set(descriptor, new BufferItem());
  }

  /**
   * Binds a buffer
   * @param {WebGL2RenderingContext} gl
   * @param {import("./Attribute.js").BufferDescriptor} descriptor
   */
  bindBuffer(gl, descriptor) {
    const bufferItem = this.pool.get(descriptor);
    if (!bufferItem) throw new Error(`buffer ${descriptor.name} not found`);

    const target = glBufferTarget(gl, descriptor.target);
    if (!bufferItem.buffered) {
      // if not buffered, bind and buffer data
      const buffer = gl.createBuffer();
      gl.bindBuffer(target, buffer);
      gl.bufferData(target, descriptor.data, glBufferUsage(gl, descriptor.usage));
      bufferItem.buffer = buffer;
    } else if (descriptor.updated) {
      // if updated,
      // check whether current webgl buffer has enough size to store new data.
      // If true, reuse the WebGL buffer
      gl.bindBuffer(target, bufferItem.buffer);
      const currentBufferSize = gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE);
      if (currentBufferSize >= descriptor.data.byteLength) {
        gl.bufferSubData(target, 0, descriptor.data);
      } else {
        gl.bufferData(target, descriptor.data, glBufferUsage(gl, descriptor.usage));
      }
    } else {
      // if buffered, bind buffer only
      gl.bindBuffer(target, bufferItem.buffer);
    }

    descriptor.updated = false;
    bufferItem.buffered = true;
  }

  /**
   * Unbinds a buffer
   * @param {WebGL2RenderingContext} gl
   * @param {import("./Attribute.js").BufferDescriptor} descriptor
   */
  unbindBuffer(gl, descriptor) {
    gl.bindBuffer(glBufferTarget(gl, descriptor.target), null);
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
   * @type {import("./material/Material.js").AttributeBinding}
   */
  binding;

  /**
   *
   * @param {number} location
   * @param {import("./material/Material.js").AttributeBinding} binding
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
   * @type {(import("./material/Material.js").MaterialUniformBinding | import("./material/Material.js").EntityUniformBinding | import("./material/Material.js").MainCameraUniformBinding)[]}
   */
  uniformBindings;
  /**
   * @type {import("./Constants.js").DrawMode}
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

      this.attributes.set(binding.name, new MaterialAttribute(location, binding));
    });
    this.uniformBindings.forEach((binding) => {
      const location = gl.getUniformLocation(program, binding.name);
      if (location === null) throw new Error(`failed to get uniform location of ${binding.name}`);

      this.uniforms.set(binding.name, new MaterialUniform(location, binding));
    });

    this.program = program;
    this.compiled = true;
  }
}

class MaterialPool {
  /**
   * @type {Map<string, MaterialItem>}
   */
  materials = new Map();

  /**
   * Sets a new material.
   * @param {import("./material/Material.js").Material} material
   */
  setMaterial(material) {
    const name = material.name();
    if (this.materials.has(name)) return;

    this.materials.set(name, new MaterialItem(material));
  }

  /**
   * Uses an existing material
   * @param {WebGL2RenderingContext} gl
   * @param {string} name
   */
  getMaterial(gl, name) {
    const material = this.materials.get(name);
    if (!material) throw new Error(`material ${name} not found`);

    if (!material.compiled) {
      material.compile(gl);
    }

    return material;
  }
}
