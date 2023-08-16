import { vec3 } from "gl-matrix";
import { DrawMode, UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { Uniform } from "../../../libs/Uniform";
import { CameraUniformNames } from "../../../libs/camera/Camera";
import { getCanvas, watchInput, watchInputs } from "../../../libs/common";
import { BlenderCamera } from "../../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../../libs/material/Material";

class PointLight extends Material {
  name() {
    return "PointLight";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Normal;
      
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;
      uniform mat4 u_NormalMatrix;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = vec3(u_NormalMatrix * a_Normal);
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
    
      uniform vec3 u_LightPosition;
      uniform vec3 u_DiffuseLightColor;
      uniform vec3 u_SpecularLightColor;
      uniform float u_SpecularLightShininessExponent;
    
      uniform float u_DiffuseLightIntensity;
      uniform float u_SpecularLightIntensity;
      uniform vec3 u_LightAttenuations;
    
      uniform vec3 u_CameraPosition;
    
      uniform vec3 u_DiffuseReflection;
      uniform vec3 u_SpecularReflection;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates diffuse reflection color
       */
      vec3 diffuse(float attenuation, vec3 normal, vec3 lightDirection) {
        float cosine = max(dot(normal, lightDirection), 0.0);
        return attenuation * u_DiffuseLightIntensity * u_DiffuseLightColor * u_DiffuseReflection * cosine;
      }
    
      /**
       * Calculates specular reflection color
       */
      vec3 specular(float attenuation, vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return attenuation * u_SpecularLightIntensity * u_SpecularLightColor * u_SpecularReflection * power;
      }
    
      void main() {
        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(u_LightPosition - v_Position);
        vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
        vec3 reflectionDirection = reflect(-lightDirection, normal);
    
        float distanceToLight = distance(v_Position, u_LightPosition);
        float distanceToCamera = distance(v_Position, u_CameraPosition);
        float attenuationDistance = distanceToLight + distanceToCamera;
        float attenuationComponent = u_LightAttenuations.x + u_LightAttenuations.y * attenuationDistance + u_LightAttenuations.z * pow(attenuationDistance, 2.0);
        float attenuation = attenuationComponent == 0.0 ? 1.0 : 1.0 / attenuationComponent;
        
        vec3 diffuseColor = diffuse(attenuation, normal, lightDirection);
        vec3 specularColor = specular(attenuation, normal, reflectionDirection, cameraDirection);
    
        gl_FragColor = vec4(diffuseColor + specularColor, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.Normal),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new MaterialUniformBinding("u_SpecularLightShininessExponent"),
      new MaterialUniformBinding("u_DiffuseReflection"),
      new MaterialUniformBinding("u_SpecularReflection"),
      new MaterialUniformBinding("u_LightPosition"),
      new MaterialUniformBinding("u_DiffuseLightColor"),
      new MaterialUniformBinding("u_SpecularLightColor"),
      new MaterialUniformBinding("u_DiffuseLightIntensity"),
      new MaterialUniformBinding("u_SpecularLightIntensity"),
      new MaterialUniformBinding("u_LightAttenuations"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  lightPosition = vec3.fromValues(5, 5, 5);
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  diffuseReflection = vec3.fromValues(0.4, 0.4, 1);
  specularReflection = vec3.fromValues(0.4, 0.4, 1);
  specularLightShininessExponent = new Float32Array(1);

  diffuseLightIntensity = new Float32Array(1);
  specularLightIntensity = new Float32Array(1);

  lightAttenuations = vec3.create();

  constructor() {
    super();
    this.uniforms.set("u_LightPosition", new Uniform(UniformType.FloatVector3, this.lightPosition));
    this.uniforms.set(
      "u_DiffuseLightColor",
      new Uniform(UniformType.FloatVector3, this.diffuseLightColor)
    );
    this.uniforms.set(
      "u_SpecularLightColor",
      new Uniform(UniformType.FloatVector3, this.specularLightColor)
    );
    this.uniforms.set(
      "u_DiffuseLightIntensity",
      new Uniform(UniformType.FloatVector1, this.diffuseLightIntensity)
    );
    this.uniforms.set(
      "u_SpecularLightIntensity",
      new Uniform(UniformType.FloatVector1, this.specularLightIntensity)
    );
    this.uniforms.set(
      "u_LightAttenuations",
      new Uniform(UniformType.FloatVector3, this.lightAttenuations)
    );
    this.uniforms.set(
      "u_SpecularLightShininessExponent",
      new Uniform(UniformType.FloatVector1, this.specularLightShininessExponent)
    );
    this.uniforms.set(
      "u_DiffuseReflection",
      new Uniform(UniformType.FloatVector3, this.diffuseReflection)
    );
    this.uniforms.set(
      "u_SpecularReflection",
      new Uniform(UniformType.FloatVector3, this.specularReflection)
    );
  }
}

const pointLight = new PointLight();

/**
 * Create sphere object
 */
const sphere = new Sphere(2, 24);
sphere.material = pointLight;

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

scene.renderFrame();

/**
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(pointLight.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(pointLight.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups diffuse light intensity
 */
watchInput("diffuseIntensity", (value) => {
  pointLight.diffuseLightIntensity[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups specular light intensity
 */
watchInput("specularIntensity", (value) => {
  pointLight.specularLightIntensity[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups light attenuations
 */
watchInputs(["attenuationA", "attenuationB", "attenuationC"], ([a, b, c]) => {
  vec3.set(pointLight.lightAttenuations, parseFloat(a), parseFloat(b), parseFloat(c));
  scene.renderFrame();
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  pointLight.specularLightShininessExponent[0] = parseFloat(value);
  scene.renderFrame();
});
