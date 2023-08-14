import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../../libs/Attribute";
import { DrawMode, UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { Uniform } from "../../../libs/Uniform";
import { CullFace } from "../../../libs/WebGLRenderer";
import { PerspectiveCamera } from "../../../libs/camera/Perspective";
import { getCanvas, watchInput, watchInputs } from "../../../libs/common";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Sphere } from "../../../libs/geom/Sphere";
import { AttributeBinding, EntityUniformBinding, Material } from "../../../libs/material/Material";

class FlatShading extends Material {
  name() {
    return "FlatShading";
  }

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

  attributesBindings() {
    return [new AttributeBinding(EntityAttributeNames.Position), new AttributeBinding("a_Color")];
  }

  uniformBindings() {
    return [new EntityUniformBinding(EntityUniformNames.MvpMatrix)];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  rps = glMatrix.toRadian(20);
  lightPosition = vec4.create();
  lightBasePosition = vec3.fromValues(0, 5, 5);
  lightPositionModelMatrix = mat4.create();

  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  diffuseLightIntensity = 0;
  specularLightIntensity = 0;

  attenuationFactorA = 0;
  attenuationFactorB = 0;
  attenuationFactorC = 0;

  normalMatrix = mat4.create();
  normal4 = vec4.create();
  normal3 = vec3.create();
  centroid4 = vec4.create();
  centroid3 = vec3.create();
  lightDirection = vec3.create();
  reflectionDirection = vec3.create();
  cameraDirection = vec3.create();
  attenuation = 0;

  ambientColor = vec3.create();
  specularColor = vec3.create();
  diffuseColor = vec3.create();
  color = vec3.create();

  /**
   * Calculates light position
   * @param {import("../../../libs/WebGLRenderer").FrameState} frameState
   */
  rotateLight(frameState) {
    const rotationOffset = ((frameState.time - frameState.previousTime) / 1000) * this.rps;
    mat4.rotateY(this.lightPositionModelMatrix, this.lightPositionModelMatrix, rotationOffset);
    vec3.transformMat4(this.lightPosition, this.lightBasePosition, this.lightPositionModelMatrix);
  }

  /**
   * Calculates normal matrix
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   */
  setNormalMatrix(entity) {
    mat4.invert(this.normalMatrix, entity.composedModelMatrix);
    mat4.transpose(this.normalMatrix, this.normalMatrix);
  }

  /**
   * Calculates triangle centroid and transform it using entity model matrix
   * @param {number[]} vertex0
   * @param {number[]} vertex1
   * @param {number[]} vertex2
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   */
  setCentroid([x0, y0, z0], [x1, y1, z1], [x2, y2, z2], entity) {
    // position
    vec4.set(this.centroid4, (x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3, (z0 + z1 + z2) / 3, 1);
    // normalized position equals normal of a sphere
    vec4.copy(this.normal4, this.centroid4);
    vec4.transformMat4(this.centroid4, this.centroid4, entity.composedModelMatrix);
    vec3.set(this.centroid3, this.centroid4[0], this.centroid4[1], this.centroid4[2]);
  }

  /**
   * Calculates normal of centroid, transform and normalize it using normal matrix
   */
  setNormal() {
    vec4.transformMat4(this.normal4, this.normal4, this.normalMatrix);
    vec3.set(this.normal3, this.normal4[0], this.normal4[1], this.normal4[2]);
    vec3.normalize(this.normal3, this.normal3);
  }

  /**
   * Calculates light direction from centroid to light position
   */
  setLightDirection() {
    vec3.subtract(this.lightDirection, this.lightPosition, this.centroid3);
    vec3.normalize(this.lightDirection, this.lightDirection);
  }

  /**
   * Calculates light reflection direction from normal and light direction
   */
  setReflectionDirection() {
    vec3.scale(
      this.reflectionDirection,
      this.normal3,
      2 * vec3.dot(this.lightDirection, this.normal3)
    );
    vec3.subtract(this.reflectionDirection, this.reflectionDirection, this.lightDirection);
    vec3.normalize(this.reflectionDirection, this.reflectionDirection);
  }

  /**
   * Calculates camera position
   * @param {import("../../../libs/WebGLRenderer").FrameState} frameState
   */
  setCameraDirection(frameState) {
    vec3.subtract(this.cameraDirection, frameState.scene.mainCamera.position, this.centroid3);
    vec3.normalize(this.cameraDirection, this.cameraDirection);
  }

  /**
   * Calculates light attenuation
   */
  setAttenuation() {
    const distance = vec3.distance(this.lightPosition, this.centroid3);
    this.attenuation =
      1 /
      (this.attenuationFactorA +
        this.attenuationFactorB * distance +
        this.attenuationFactorC * Math.pow(distance, 2));
  }

  /**
   * Calculates ambient color
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   */
  setAmbientColor(entity) {
    vec3.mul(
      this.ambientColor,
      this.ambientLightColor,
      entity.uniforms.get("u_AmbientReflection").data
    );
  }

  /**
   * Calculates diffuse color
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   */
  setDiffuseColor(entity) {
    const cosine = Math.max(vec3.dot(this.normal3, this.lightDirection), 0.0);

    vec3.mul(
      this.diffuseColor,
      this.diffuseLightColor,
      entity.uniforms.get("u_DiffuseReflection").data
    );
    vec3.scale(
      this.diffuseColor,
      this.diffuseColor,
      this.diffuseLightIntensity * this.attenuation * cosine
    );
  }

  /**
   * Calculates specular color
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   */
  setSpecularColor(entity) {
    const cosine = Math.max(vec3.dot(this.reflectionDirection, this.cameraDirection), 0.0);
    const specularPower = Math.pow(
      cosine,
      entity.uniforms.get("u_SpecularLightShininessExponent").data[0]
    );

    vec3.mul(
      this.specularColor,
      this.specularLightColor,
      entity.uniforms.get("u_SpecularReflection").data
    );
    vec3.scale(
      this.specularColor,
      this.specularColor,
      this.specularLightIntensity * this.attenuation * specularPower
    );
  }

  /**
   * Composes ambient color, diffuse color and specular color
   */
  composeColor() {
    vec3.zero(this.color);
    vec3.add(this.color, this.color, this.ambientColor);
    vec3.add(this.color, this.color, this.diffuseColor);
    vec3.add(this.color, this.color, this.specularColor);
  }

  /**
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {import("../../../libs/WebGLRenderer").FrameState} frameState
   */
  prerender(entity, frameState) {
    this.rotateLight(frameState);
    this.setNormalMatrix(entity);

    // iterate every triangles
    /**@type {import("../../../libs/Attribute").BufferDescriptor} */
    const vertices = entity.attributes.get(EntityAttributeNames.Position).descriptor;
    /**@type {import("../../../libs/Attribute").BufferDescriptor} */
    const colors = entity.attributes.get("a_Color").descriptor;
    for (let i = 0; i < vertices.data.length; i += 9) {
      const vertex0 = vertices.data.slice(i + 0, i + 3);
      const vertex1 = vertices.data.slice(i + 3, i + 6);
      const vertex2 = vertices.data.slice(i + 6, i + 9);

      this.setCentroid(vertex0, vertex1, vertex2, entity);
      this.setNormal();
      this.setLightDirection();
      this.setReflectionDirection();
      this.setCameraDirection(frameState);
      this.setAttenuation();

      this.setAmbientColor(entity);
      this.setDiffuseColor(entity);
      this.setSpecularColor(entity);
      this.composeColor();

      colors.data.set(this.color, i + 0);
      colors.data.set(this.color, i + 3);
      colors.data.set(this.color, i + 6);
    }

    colors.updated = true;
  }
}

const flatShading = new FlatShading();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = flatShading;
sphere.attributes.set(
  "a_Color",
  new BufferAttribute(new BufferDescriptor(new Float32Array(sphere.verticesCount * 3)), 3)
);
sphere.uniforms.set(
  "u_SpecularLightShininessExponent",
  new Uniform(UniformType.FloatVector1, new Float32Array([512]))
);
sphere.uniforms.set(
  "u_AmbientReflection",
  new Uniform(UniformType.FloatVector3, vec3.fromValues(0.4, 0.4, 1))
);
sphere.uniforms.set(
  "u_DiffuseReflection",
  new Uniform(UniformType.FloatVector3, vec3.fromValues(0.4, 0.4, 1))
);
sphere.uniforms.set(
  "u_SpecularReflection",
  new Uniform(UniformType.FloatVector3, vec3.fromValues(0.4, 0.4, 1))
);

/**
 * Create scene
 */
const canvas = getCanvas();
const scene = new Scene(canvas, {
  cullFace: CullFace.Back,
  camera: new PerspectiveCamera(
    glMatrix.toRadian(50),
    canvas.width / canvas.height,
    1,
    1000,
    vec3.fromValues(0, 0, 6),
    vec3.fromValues(0, 0, 0),
    vec3.fromValues(0, 1, 0)
  ),
});
scene.root.addChild(sphere); // add sphere object into scene

/**
 * Setups ambient light color
 */
watchInputs(["ambientColorR", "ambientColorG", "ambientColorB"], ([r, g, b]) => {
  vec3.set(flatShading.ambientLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(flatShading.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(flatShading.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups diffuse light intensity
 */
watchInput("diffuseIntensity", (value) => {
  flatShading.diffuseLightIntensity = parseFloat(value);
});
/**
 * Setups specular light intensity
 */
watchInput("specularIntensity", (value) => {
  flatShading.specularLightIntensity = parseFloat(value);
});
/**
 * Setups light attenuations
 */
watchInput(["attenuationA"], (a) => {
  flatShading.attenuationFactorA = parseFloat(a);
});
watchInput(["attenuationB"], (b) => {
  flatShading.attenuationFactorB = parseFloat(b);
});
watchInput(["attenuationC"], (c) => {
  flatShading.attenuationFactorC = parseFloat(c);
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  sphere.uniforms.get("u_SpecularLightShininessExponent").data[0] = parseFloat(value);
});

/**
 * Start rendering
 */
scene.startRendering();
