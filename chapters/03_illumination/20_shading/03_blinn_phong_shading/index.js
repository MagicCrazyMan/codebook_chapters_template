import { glMatrix, mat4, vec3 } from "gl-matrix";
import { DrawMode, UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { CullFace } from "../../../libs/WebGLRenderer";
import { CameraUniformNames } from "../../../libs/camera/Camera";
import { PerspectiveCamera } from "../../../libs/camera/Perspective";
import { getCanvas } from "../../../libs/common";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  AttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../../libs/material/Material";
import { Uniform } from "../../../libs/Uniform";

class BlinnPhongMaterial extends Material {
  name() {
    return "BlinnPhongMaterial";
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

      uniform vec3 u_CameraPosition;

      uniform vec3 u_DiffuseReflection;
      uniform vec3 u_SpecularReflection;
      varying vec3 v_AmbientColor;

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
      vec3 specular(float attenuation, vec3 normal, vec3 lightDirection, vec3 cameraDirection) {
        vec3 halfway = normalize(lightDirection + cameraDirection);
        float cosine = max(dot(normal, halfway), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return attenuation * u_SpecularLightIntensity * u_SpecularLightColor * u_SpecularReflection * power;
      }

      void main() {
        vec3 normal = normalize(v_Normal);
        vec3 lightDirection = normalize(u_LightPosition - v_Position);
        vec3 cameraDirection = normalize(u_CameraPosition - v_Position);

        float distanceToLight = distance(v_Position, u_LightPosition);
        float attenuationComponent = u_LightAttenuations.x + u_LightAttenuations.y * distanceToLight + u_LightAttenuations.z * pow(distanceToLight, 2.0);
        float attenuation = attenuationComponent == 0.0 ? 1.0 : 1.0 / attenuationComponent;
        
        vec3 diffuseColor = diffuse(attenuation, normal, lightDirection);
        vec3 specularColor = specular(attenuation, normal, lightDirection, cameraDirection);

        gl_FragColor = vec4(v_AmbientColor + diffuseColor + specularColor, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [
      new AttributeBinding(EntityAttributeNames.Position),
      new AttributeBinding(EntityAttributeNames.Normal),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new EntityUniformBinding("u_SpecularLightShininessExponent"),
      new EntityUniformBinding("u_AmbientReflection"),
      new EntityUniformBinding("u_DiffuseReflection"),
      new EntityUniformBinding("u_SpecularReflection"),
      new MaterialUniformBinding("u_LightPosition"),
      new MaterialUniformBinding("u_AmbientLightColor"),
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

  lightPosition = vec3.create();
  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();
  diffuseLightIntensity = new Float32Array(1);
  specularLightIntensity = new Float32Array(1);
  lightAttenuations = vec3.create();

  constructor() {
    super();
    this.uniforms.set("u_LightPosition", new Uniform(UniformType.FloatVector3, this.lightPosition));
    this.uniforms.set(
      "u_AmbientLightColor",
      new Uniform(UniformType.FloatVector3, this.ambientLightColor)
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
  }
}

const blinnPhongMaterial = new BlinnPhongMaterial();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = blinnPhongMaterial;
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
 * Updates light rotation per frame
 */
const rps = glMatrix.toRadian(20);
const lightBasePosition = vec3.fromValues(0, 5, 5);
const lightPositionModelMatrix = mat4.create();
scene.event.addEventListener("prerender", (event) => {
  /**@type {import("../../../libs/WebGLRenderer").FrameState} */
  const frameState = event.frameState;

  const rotationOffset = ((frameState.time - frameState.previousTime) / 1000) * rps;
  mat4.rotateY(lightPositionModelMatrix, lightPositionModelMatrix, rotationOffset);
  vec3.transformMat4(blinnPhongMaterial.lightPosition, lightBasePosition, lightPositionModelMatrix);
});

/**
 * Setups ambient light color
 */
const ambientLightColorInputs = [
  document.getElementById("ambientColorR"),
  document.getElementById("ambientColorG"),
  document.getElementById("ambientColorB"),
];
const setAmbientLightColor = () => {
  vec3.set(
    blinnPhongMaterial.ambientLightColor,
    parseFloat(ambientLightColorInputs[0].value),
    parseFloat(ambientLightColorInputs[1].value),
    parseFloat(ambientLightColorInputs[2].value)
  );
};
ambientLightColorInputs.forEach((input) => {
  input.addEventListener("input", setAmbientLightColor);
});
setAmbientLightColor();

/**
 * Setups diffuse light color
 */
const diffuseLightColorInputs = [
  document.getElementById("diffuseColorR"),
  document.getElementById("diffuseColorG"),
  document.getElementById("diffuseColorB"),
];
const setDiffuseLightColor = () => {
  vec3.set(
    blinnPhongMaterial.diffuseLightColor,
    parseFloat(diffuseLightColorInputs[0].value),
    parseFloat(diffuseLightColorInputs[1].value),
    parseFloat(diffuseLightColorInputs[2].value)
  );
};
diffuseLightColorInputs.forEach((input) => {
  input.addEventListener("input", setDiffuseLightColor);
});
setDiffuseLightColor();

/**
 * Setups specular light color
 */
const specularLightColorInputs = [
  document.getElementById("specularColorR"),
  document.getElementById("specularColorG"),
  document.getElementById("specularColorB"),
];
const setSpecularLightColor = () => {
  vec3.set(
    blinnPhongMaterial.specularLightColor,
    parseFloat(specularLightColorInputs[0].value),
    parseFloat(specularLightColorInputs[1].value),
    parseFloat(specularLightColorInputs[2].value)
  );
};
specularLightColorInputs.forEach((input) => {
  input.addEventListener("input", setSpecularLightColor);
});
setSpecularLightColor();

/**
 * Setups diffuse light intensity
 */
const diffuseLightIntensityInput = document.getElementById("diffuseIntensity");
const setDiffuseLightIntensity = () => {
  blinnPhongMaterial.diffuseLightIntensity[0] = parseFloat(diffuseLightIntensityInput.value);
};
diffuseLightIntensityInput.addEventListener("input", setDiffuseLightIntensity);
setDiffuseLightIntensity();

/**
 * Setups specular light intensity
 */
const specularLightIntensityInput = document.getElementById("specularIntensity");
const setSpecularLightIntensity = () => {
  blinnPhongMaterial.specularLightIntensity[0] = parseFloat(specularLightIntensityInput.value);
};
specularLightIntensityInput.addEventListener("input", setSpecularLightIntensity);
setSpecularLightIntensity();

/**
 * Setups light attenuations
 */
const lightAttenuationsInputs = [
  document.getElementById("attenuationA"),
  document.getElementById("attenuationB"),
  document.getElementById("attenuationC"),
];
const setLightAttenuations = () => {
  vec3.set(
    blinnPhongMaterial.lightAttenuations,
    parseFloat(lightAttenuationsInputs[0].value),
    parseFloat(lightAttenuationsInputs[1].value),
    parseFloat(lightAttenuationsInputs[2].value)
  );
};
lightAttenuationsInputs.forEach((input) => {
  input.addEventListener("input", setLightAttenuations);
});
setLightAttenuations();

/**
 * Setups specular light shininess exponent
 */
const specularLightShininessExponentInput = document.getElementById("specularShininessExponent");
const setSpecularShininessExponent = () => {
  sphere.uniforms.get("u_SpecularLightShininessExponent").data[0] = parseFloat(
    specularLightShininessExponentInput.value
  );
};
specularLightShininessExponentInput.addEventListener("input", setSpecularShininessExponent);
setSpecularShininessExponent();

/**
 * Start rendering
 */
scene.startRendering();
