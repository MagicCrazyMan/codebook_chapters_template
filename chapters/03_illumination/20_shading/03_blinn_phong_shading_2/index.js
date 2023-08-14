import { glMatrix, mat4, vec3 } from "gl-matrix";
import { PerspectiveCamera } from "../../../libs/camera/Perspective";
import { getCanvas } from "../../../libs/common";
import { RenderEntity, UniformTypes } from "../../../libs/entity/RenderEntity";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  Material,
  UniformSource,
  createMaterialProgram,
} from "../../../libs/material/Material";
import { CullFace } from "../../../libs/WebGLRenderer";
import { Scene } from "../../../libs/Scene";

class BlinnPhongMaterial extends Material {
  static VertexShader = `
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

  static FragmentShader = `
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

  /**
   * @private
   * @type {WebGLProgram}
   */
  static _program;
  /**
   * @private
   * @type {Map<string, number>}
   */
  static _attributeLocations;
  /**
   * @private
   * @type {Map<string, import()>}
   */
  static _uniformLocations;

  /**
   * Uses WebGL program associated with this Material,
   * Shaders and attribute locations and uniform locations should all initialize as well.
   * @param {WebGL2RenderingContext} gl
   * @returns {WebGLProgram}
   */
  static useProgram(gl) {
    if (!BlinnPhongMaterial._program) {
      const { program, attributeLocations, uniformLocations } = createMaterialProgram(
        gl,
        [BlinnPhongMaterial.VertexShader],
        [BlinnPhongMaterial.FragmentShader],
        [
          RenderEntity.BasicAttributeVariableNames.Position,
          RenderEntity.BasicAttributeVariableNames.Normal,
        ],
        [
          {
            name: RenderEntity.BasicUniformVariableNames.MvpMatrix,
            source: UniformSource.Entity,
          },
          {
            name: RenderEntity.BasicUniformVariableNames.ModelMatrix,
            source: UniformSource.Entity,
          },
          {
            name: RenderEntity.BasicUniformVariableNames.NormalMatrix,
            source: UniformSource.Entity,
          },
          {
            name: "u_SpecularLightShininessExponent",
            source: UniformSource.Entity,
          },
          {
            name: "u_AmbientReflection",
            source: UniformSource.Entity,
          },
          {
            name: "u_DiffuseReflection",
            source: UniformSource.Entity,
          },
          {
            name: "u_SpecularReflection",
            source: UniformSource.Entity,
          },
          {
            name: "u_LightPosition",
            source: UniformSource.Material,
          },
          {
            name: "u_AmbientLightColor",
            source: UniformSource.Material,
          },
          {
            name: "u_DiffuseLightColor",
            source: UniformSource.Material,
          },
          {
            name: "u_SpecularLightColor",
            source: UniformSource.Material,
          },
          {
            name: "u_DiffuseLightIntensity",
            source: UniformSource.Material,
          },
          {
            name: "u_SpecularLightIntensity",
            source: UniformSource.Material,
          },
          {
            name: "u_LightAttenuations",
            source: UniformSource.Material,
          },
          {
            name: "u_CameraPosition",
            source: UniformSource.MainCamera,
          },
        ]
      );

      BlinnPhongMaterial._program = program;
      BlinnPhongMaterial._attributeLocations = attributeLocations;
      BlinnPhongMaterial._uniformLocations = uniformLocations;
    }

    gl.useProgram(BlinnPhongMaterial._program);
  }

  /**
   * Gets WebGL attribute variable names associated the program
   * @returns {Map<string, number>}
   */
  static getAttributeLocations() {
    return this._attributeLocations;
  }

  /**
   * Gets WebGL uniform variable names associated the program
   * @returns {Map<string, UniformSource>}
   */
  static getUniformLocations() {
    return this._uniformLocations;
  }

  lightPosition = vec3.create();
  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();
  diffuseLightIntensity = [0];
  specularLightIntensity = [0];
  lightAttenuations = vec3.create();

  constructor() {
    super();
    this.setUniform("u_LightPosition", {
      type: UniformTypes.FloatVector3,
      data: this.lightPosition,
    });
    this.setUniform("u_AmbientLightColor", {
      type: UniformTypes.FloatVector3,
      data: this.ambientLightColor,
    });
    this.setUniform("u_DiffuseLightColor", {
      type: UniformTypes.FloatVector3,
      data: this.diffuseLightColor,
    });
    this.setUniform("u_SpecularLightColor", {
      type: UniformTypes.FloatVector3,
      data: this.specularLightColor,
    });
    this.setUniform("u_DiffuseLightIntensity", {
      type: UniformTypes.FloatVector1,
      data: this.diffuseLightIntensity,
    });
    this.setUniform("u_SpecularLightIntensity", {
      type: UniformTypes.FloatVector1,
      data: this.specularLightIntensity,
    });
    this.setUniform("u_LightAttenuations", {
      type: UniformTypes.FloatVector3,
      data: this.lightAttenuations,
    });
  }
}

const blinnPhongMaterial = new BlinnPhongMaterial();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = blinnPhongMaterial;
sphere.setUniform("u_SpecularLightShininessExponent", {
  type: UniformTypes.FloatVector1,
  data: [512],
});
sphere.setUniform("u_AmbientReflection", {
  type: UniformTypes.FloatVector3,
  data: vec3.fromValues(0.4, 0.4, 1),
});
sphere.setUniform("u_DiffuseReflection", {
  type: UniformTypes.FloatVector3,
  data: vec3.fromValues(0.4, 0.4, 1),
});
sphere.setUniform("u_SpecularReflection", {
  type: UniformTypes.FloatVector3,
  data: vec3.fromValues(0.4, 0.4, 1),
});

/**
 * Create scene
 */
const canvas = getCanvas();
const scene = new Scene(canvas, {
  enableCullFace: CullFace.Back,
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
const lightAttenuationsInput = [
  document.getElementById("attenuationA"),
  document.getElementById("attenuationB"),
  document.getElementById("attenuationC"),
];
const setLightAttenuations = () => {
  vec3.set(
    blinnPhongMaterial.lightAttenuations,
    parseFloat(lightAttenuationsInput[0].value),
    parseFloat(lightAttenuationsInput[1].value),
    parseFloat(lightAttenuationsInput[2].value)
  );
};
specularLightColorInputs.forEach((input) => {
  input.addEventListener("input", setLightAttenuations);
});
setLightAttenuations();

/**
 * Setups specular light shininess exponent
 */
const specularLightShininessExponentInput = document.getElementById("specularShininessExponent");
const setSpecularShininessExponent = () => {
  sphere.setUniform("u_SpecularLightShininessExponent", {
    type: UniformTypes.FloatVector1,
    data: [parseFloat(specularLightShininessExponentInput.value)],
  });
};
specularLightIntensityInput.addEventListener("input", setSpecularShininessExponent);
setSpecularShininessExponent();

/**
 * Start rendering
 */
scene.startRendering();
