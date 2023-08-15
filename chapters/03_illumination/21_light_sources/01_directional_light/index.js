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

class DirectionalLight extends Material {
  name() {
    return "PhongShading";
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
    
      uniform vec3 u_LightDirection;
      uniform vec3 u_DiffuseLightColor;
      uniform vec3 u_SpecularLightColor;
      uniform float u_SpecularLightShininessExponent;
    
      uniform vec3 u_CameraPosition;
    
      uniform vec3 u_DiffuseReflection;
      uniform vec3 u_SpecularReflection;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates diffuse reflection color
       */
      vec3 diffuse(vec3 normal, vec3 lightDirection) {
        float cosine = max(dot(normal, lightDirection), 0.0);
        return u_DiffuseLightColor * u_DiffuseReflection * cosine;
      }
    
      /**
       * Calculates specular reflection color
       */
      vec3 specular(vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return u_SpecularLightColor * u_SpecularReflection * power;
      }
    
      void main() {
        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(u_LightDirection);
        vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
        vec3 reflectionDirection = reflect(-lightDirection, normal);
    
        vec3 diffuseColor = diffuse(normal, lightDirection);
        vec3 specularColor = specular(normal, reflectionDirection, cameraDirection);
    
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
      new MaterialUniformBinding("u_LightDirection"),
      new MaterialUniformBinding("u_DiffuseLightColor"),
      new MaterialUniformBinding("u_SpecularLightColor"),
      new MaterialUniformBinding("u_SpecularLightShininessExponent"),
      new MaterialUniformBinding("u_DiffuseReflection"),
      new MaterialUniformBinding("u_SpecularReflection"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  lightDirection = vec3.fromValues(5, 5, 5);
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  diffuseReflection = vec3.fromValues(0.4, 0.4, 1);
  specularReflection = vec3.fromValues(0.4, 0.4, 1);
  specularLightShininessExponent = new Float32Array(1);

  constructor() {
    super();
    this.uniforms.set(
      "u_LightDirection",
      new Uniform(UniformType.FloatVector3, this.lightDirection)
    );
    this.uniforms.set(
      "u_DiffuseLightColor",
      new Uniform(UniformType.FloatVector3, this.diffuseLightColor)
    );
    this.uniforms.set(
      "u_SpecularLightColor",
      new Uniform(UniformType.FloatVector3, this.specularLightColor)
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

const directionalLight = new DirectionalLight();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = directionalLight;

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
  vec3.set(directionalLight.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(directionalLight.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  directionalLight.specularLightShininessExponent[0] = parseFloat(value);
  scene.renderFrame();
});
