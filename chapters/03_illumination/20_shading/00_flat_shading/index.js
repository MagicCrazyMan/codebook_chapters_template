import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../../libs/Attribute";
import { Scene } from "../../../libs/Scene";
import { getCanvas, watchInput, watchInputs } from "../../../libs/common";
import { BlenderCamera } from "../../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Axes } from "../../../libs/geom/Axes";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialAttributeBinding,
} from "../../../libs/material/Material";

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
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new MaterialAttributeBinding("a_Color"),
    ];
  }

  uniformBindings() {
    return [new EntityUniformBinding(EntityUniformNames.MvpMatrix)];
  }

  rps = glMatrix.toRadian(20);
  lightPosition = vec4.create();
  lightBasePosition = vec3.fromValues(0, 5, 5);
  lightPositionModelMatrix = mat4.create();

  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  ambientReflection = vec3.fromValues(0.4, 0.4, 1);
  diffuseReflection = vec3.fromValues(0.4, 0.4, 1);
  specularReflection = vec3.fromValues(0.4, 0.4, 1);
  specularLightShininessExponent = 0;

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
   * Creates color buffer attribute
   * @param {import("../../../libs/entity/RenderEntity").RenderEntity} entity
   * @returns {import("../../../libs/Attribute").BufferAttribute}
   */
  setColorAttribute(entity) {
    // create color buffer if not created
    let attribute = this.attributes.get("a_Color");
    if (!attribute) {
      attribute = new BufferAttribute(
        new BufferDescriptor(new Float32Array(entity.verticesCount * 3)),
        3
      );
      this.attributes.set("a_Color", attribute);
    }

    return attribute;
  }

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
   * @param {import("../../../libs/WebGLRenderer").FrameState} frameState
   */
  setAttenuation(frameState) {
    const distanceToLight = vec3.distance(this.lightPosition, this.centroid3);
    const distanceToCamera = vec3.distance(frameState.scene.mainCamera.position, this.centroid3);
    const distance = distanceToLight + distanceToCamera;
    this.attenuation =
      1 /
      (this.attenuationFactorA +
        this.attenuationFactorB * distance +
        this.attenuationFactorC * Math.pow(distance, 2));
  }

  /**
   * Calculates ambient color
   */
  setAmbientColor() {
    vec3.mul(this.ambientColor, this.ambientLightColor, this.ambientReflection);
  }

  /**
   * Calculates diffuse color
   */
  setDiffuseColor() {
    const cosine = Math.max(vec3.dot(this.normal3, this.lightDirection), 0.0);

    vec3.mul(this.diffuseColor, this.diffuseLightColor, this.diffuseReflection);
    vec3.scale(
      this.diffuseColor,
      this.diffuseColor,
      this.diffuseLightIntensity * this.attenuation * cosine
    );
  }

  /**
   * Calculates specular color
   */
  setSpecularColor() {
    const cosine = Math.max(vec3.dot(this.reflectionDirection, this.cameraDirection), 0.0);
    const specularPower = Math.pow(cosine, this.specularLightShininessExponent);

    vec3.mul(this.specularColor, this.specularLightColor, this.specularReflection);
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
    const colorAttribute = this.setColorAttribute(entity);

    this.rotateLight(frameState);
    this.setNormalMatrix(entity);

    // iterate every triangles
    /**@type {import("../../../libs/Attribute").BufferAttribute} */
    const verticesAttribute = entity.attributes.get(EntityAttributeNames.Position);
    const valuesPerVertex = verticesAttribute.size;
    const valuesOffset =
      verticesAttribute.byteOffset / verticesAttribute.descriptor.bytesPerElement;
    for (let i = 0; i < entity.verticesCount * valuesPerVertex; i += valuesPerVertex * 3) {
      const valueIndex = i + valuesOffset;
      const vertex0 = verticesAttribute.descriptor.data.slice(
        valueIndex + valuesPerVertex * 0,
        valueIndex + valuesPerVertex * 1
      );
      const vertex1 = verticesAttribute.descriptor.data.slice(
        valueIndex + valuesPerVertex * 1,
        valueIndex + valuesPerVertex * 2
      );
      const vertex2 = verticesAttribute.descriptor.data.slice(
        valueIndex + valuesPerVertex * 2,
        valueIndex + valuesPerVertex * 3
      );

      this.setCentroid(vertex0, vertex1, vertex2, entity);
      this.setNormal();
      this.setLightDirection();
      this.setReflectionDirection();
      this.setCameraDirection(frameState);
      this.setAttenuation(frameState);

      this.setAmbientColor();
      this.setDiffuseColor();
      this.setSpecularColor();
      this.composeColor();

      colorAttribute.descriptor.data.set(this.color, i + 0);
      colorAttribute.descriptor.data.set(this.color, i + 3);
      colorAttribute.descriptor.data.set(this.color, i + 6);
    }

    colorAttribute.descriptor.updated = true;
  }
}

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
const flatShading = new FlatShading(sphere.verticesCount);
sphere.material = flatShading;

/**
 * Create scene
 */
const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(0, 0, -1),
  })
);

scene.root.addChild(sphere);
scene.root.addChild(new Axes(4));

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
watchInput("attenuationA", (a) => {
  flatShading.attenuationFactorA = parseFloat(a);
});
watchInput("attenuationB", (b) => {
  flatShading.attenuationFactorB = parseFloat(b);
});
watchInput("attenuationC", (c) => {
  flatShading.attenuationFactorC = parseFloat(c);
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  flatShading.specularLightShininessExponent = parseFloat(value);
});

/**
 * Start rendering
 */
scene.startRendering();
