import { glMatrix, vec3 } from "gl-matrix";
import { CullFace, DrawMode, UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { Uniform } from "../../../libs/Uniform";
import { CameraUniformNames } from "../../../libs/camera/Camera";
import { PerspectiveCamera } from "../../../libs/camera/Perspective";
import { getCanvas, watchInput, watchInputs } from "../../../libs/common";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../../libs/material/Material";

class SpotLight extends Material {
  name() {
    return "SpotLight";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Normal;
      
      uniform vec3 u_AmbientReflection;
    
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;
      uniform mat4 u_NormalMatrix;
    
      uniform vec3 u_AmbientLightColor;
    
      varying vec3 v_AmbientColor;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates ambient reflection color
       */
      vec3 ambient() {
        return u_AmbientLightColor * u_AmbientReflection;
      }
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = vec3(u_NormalMatrix * a_Normal);
    
        v_AmbientColor = ambient();
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
    
      uniform vec3 u_SpotlightViewDirection;
      uniform float u_SpotlightOuterLimit;
      uniform float u_SpotlightInnerLimit;
    
      uniform vec3 u_CameraPosition;
    
      uniform vec3 u_DiffuseReflection;
      uniform vec3 u_SpecularReflection;
    
      varying vec3 v_AmbientColor;
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates spotlight step
       */
      float spotlightStep(vec3 lightDirection) {
        float limit = dot(-lightDirection, u_SpotlightViewDirection);
    
        if (limit >= u_SpotlightInnerLimit) {
          return 1.0;
        } else if (limit <= u_SpotlightOuterLimit) {
          return 0.0;
        } else {
          return smoothstep(u_SpotlightOuterLimit, u_SpotlightInnerLimit, limit);
        }
      }
    
      /**
       * Calculates diffuse reflection color
       */
      vec3 diffuse(float step, float attenuation, vec3 normal, vec3 lightDirection) {
        float cosine = max(dot(normal, lightDirection), 0.0);
        return step * attenuation * u_DiffuseLightIntensity * u_DiffuseLightColor * u_DiffuseReflection * cosine;
      }
    
      /**
       * Calculates specular reflection color
       */
      vec3 specular(float step, float attenuation, vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return step * attenuation * u_SpecularLightIntensity * u_SpecularLightColor * u_SpecularReflection * power;
      }
    
      void main() {
        vec3 lightDirection = normalize(u_LightPosition - v_Position);
    
        float step = spotlightStep(lightDirection);
        if (step == 0.0) {
          // outside outer limits, no spotlight
          gl_FragColor = vec4(v_AmbientColor, 1.0);
        } else {
          // inside spotlight
          vec3 normal = normalize(v_Normal);
          vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
          vec3 reflectionDirection = reflect(-lightDirection, normal);
    
          float distanceToLight = distance(v_Position, u_LightPosition);
          float attenuationComponent = u_LightAttenuations.x + u_LightAttenuations.y * distanceToLight + u_LightAttenuations.z * pow(distanceToLight, 2.0);
          float attenuation = attenuationComponent == 0.0 ? 1.0 : 1.0 / attenuationComponent;
    
          vec3 diffuseColor = diffuse(step, attenuation, normal, lightDirection);
          vec3 specularColor = specular(step, attenuation, normal, reflectionDirection, cameraDirection);
      
          gl_FragColor = vec4(v_AmbientColor + diffuseColor + specularColor, 1.0);
        }
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
      new MaterialUniformBinding("u_SpotlightViewDirection"),
      new MaterialUniformBinding("u_SpotlightOuterLimit"),
      new MaterialUniformBinding("u_SpotlightInnerLimit"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  lightPosition = vec3.fromValues(3, 1, 5);
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  diffuseReflection = vec3.fromValues(0.4, 0.4, 1);
  specularReflection = vec3.fromValues(0.4, 0.4, 1);
  specularLightShininessExponent = new Float32Array(1);

  diffuseLightIntensity = new Float32Array(1);
  specularLightIntensity = new Float32Array(1);
  lightAttenuations = vec3.create();

  spotlightViewDirection = vec3.normalize(vec3.create(), vec3.fromValues(-3, -1, -5));
  spotlightOuterLimit = new Float32Array(1);
  spotlightInnerLimit = new Float32Array(1);

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
    this.uniforms.set(
      "u_SpotlightViewDirection",
      new Uniform(UniformType.FloatVector3, this.spotlightViewDirection)
    );
    this.uniforms.set(
      "u_SpotlightInnerLimit",
      new Uniform(UniformType.FloatVector1, this.spotlightInnerLimit)
    );
    this.uniforms.set(
      "u_SpotlightOuterLimit",
      new Uniform(UniformType.FloatVector1, this.spotlightOuterLimit)
    );
  }
}

const spotLight = new SpotLight();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = spotLight;

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
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(spotLight.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(spotLight.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups diffuse light intensity
 */
watchInput("diffuseIntensity", (value) => {
  spotLight.diffuseLightIntensity[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups specular light intensity
 */
watchInput("specularIntensity", (value) => {
  spotLight.specularLightIntensity[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups light attenuations
 */
watchInputs(["attenuationA", "attenuationB", "attenuationC"], ([a, b, c]) => {
  vec3.set(spotLight.lightAttenuations, parseFloat(a), parseFloat(b), parseFloat(c));
  scene.renderFrame();
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  spotLight.specularLightShininessExponent[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups spot light outer limit
 */
watchInput("spotlightOuterLimit", (value) => {
  spotLight.spotlightOuterLimit[0] = Math.cos(glMatrix.toRadian(parseFloat(value)));
  scene.renderFrame();
});
/**
 * Setups spot light inner limit
 */
watchInput("spotlightInnerLimit", (value) => {
  spotLight.spotlightInnerLimit[0] = Math.cos(glMatrix.toRadian(parseFloat(value)));
  scene.renderFrame();
});
