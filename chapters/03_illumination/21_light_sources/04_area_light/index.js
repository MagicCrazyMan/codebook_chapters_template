import { mat4, quat, vec3, vec4 } from "gl-matrix";
import { UniformType } from "../../../libs/Constants";
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
import { Axes } from "../../../libs/geom/Axes";

class AreaLight extends Material {
  name() {
    return "AreaLight";
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
    
      uniform vec3 u_DiffuseLightColor;
      uniform vec3 u_SpecularLightColor;
      uniform float u_SpecularLightShininessExponent;
    
      uniform float u_DiffuseLightIntensity;
      uniform float u_SpecularLightIntensity;
      uniform vec3 u_LightAttenuations;
      
      uniform vec3 u_LightPosition;
      uniform vec3 u_AreaLightViewingPlaneNormal; // this is also viewing direction
      uniform vec3 u_AreaLightViewingPlanePosition;
      uniform mat4 u_AreaLightInvertModelMatrix;
      uniform vec4 u_AreaLightExtent;
    
      uniform vec3 u_CameraPosition;
    
      uniform vec3 u_DiffuseReflection;
      uniform vec3 u_SpecularReflection;
    
      varying vec3 v_AmbientColor;
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      /**
       * Calculates area light visibility
       */
      float areaLightStep(vec3 lightDirection) {
        float areaLightMinX = u_AreaLightExtent[0];
        float areaLightMinY = u_AreaLightExtent[1];
        float areaLightMaxX = u_AreaLightExtent[2];
        float areaLightMaxY = u_AreaLightExtent[3];

        // return 0.0 if width or height is 0.0
        if (areaLightMaxX - areaLightMinX == 0.0 || areaLightMaxY - areaLightMinY == 0.0)
          return 0.0;
          
        // returns 0.0 if position behind area light
        float cosineAngle = dot(-lightDirection, u_AreaLightViewingPlaneNormal);
        if (cosineAngle < 0.0)
          return 0.0;
    
        // returns 0.0 if position behind area light plane
        float cosineAnglePlane = dot(v_Position - u_AreaLightViewingPlanePosition, u_AreaLightViewingPlaneNormal);
        if (cosineAnglePlane < 0.0)
          return 0.0;
    
        // projects current position to area light plane and normalizes to XY plane
        float distBase = distance(vec3(0.0, 0.0, 0.0), u_AreaLightViewingPlaneNormal);
        float distToPlane = cosineAnglePlane / distBase;
        float scale = distToPlane / cosineAngle;
        vec3 forward = lightDirection * scale;
        vec3 projected = v_Position + forward;
    
        vec4 invertTransformed = u_AreaLightInvertModelMatrix * vec4(projected, 1.0);
    
        // after invert transformation, point stays on XY plane
        float x = invertTransformed.x;
        float y = invertTransformed.y;
    
        if (x >= areaLightMinX && x <= areaLightMaxX && y >= areaLightMinY && y <= areaLightMaxY) {
          float smoothX = smoothstep(areaLightMaxX, 0.0, abs(x));
          float smoothY = smoothstep(areaLightMaxY, 0.0, abs(y));
          return min(smoothX, smoothY);
        } else {
          return 0.0;
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
    
        float step = areaLightStep(lightDirection);
        if (step == 0.0) {
          // outside outer limits, no area light
          gl_FragColor = vec4(v_AmbientColor, 1.0);
        } else {
          // inside area light
          vec3 normal = normalize(v_Normal);
          vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
          vec3 reflectionDirection = reflect(-lightDirection, normal);
    
          float distanceToLight = distance(v_Position, u_LightPosition);
          float distanceToCamera = distance(v_Position, u_CameraPosition);
          float attenuationDistance = distanceToLight + distanceToCamera;
          float attenuationComponent = u_LightAttenuations.x + u_LightAttenuations.y * attenuationDistance + u_LightAttenuations.z * pow(attenuationDistance, 2.0);
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
      new MaterialUniformBinding("u_AmbientReflection"),
      new MaterialUniformBinding("u_DiffuseReflection"),
      new MaterialUniformBinding("u_SpecularReflection"),
      new MaterialUniformBinding("u_LightPosition"),
      new MaterialUniformBinding("u_AmbientLightColor"),
      new MaterialUniformBinding("u_DiffuseLightColor"),
      new MaterialUniformBinding("u_SpecularLightColor"),
      new MaterialUniformBinding("u_DiffuseLightIntensity"),
      new MaterialUniformBinding("u_SpecularLightIntensity"),
      new MaterialUniformBinding("u_LightAttenuations"),
      new MaterialUniformBinding("u_AreaLightViewingPlaneNormal"),
      new MaterialUniformBinding("u_AreaLightViewingPlanePosition"),
      new MaterialUniformBinding("u_AreaLightInvertModelMatrix"),
      new MaterialUniformBinding("u_AreaLightExtent"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  ambientReflection = vec3.fromValues(0.4, 0.4, 1);
  diffuseReflection = vec3.fromValues(0.4, 0.4, 1);
  specularReflection = vec3.fromValues(0.4, 0.4, 1);
  specularLightShininessExponent = new Float32Array(1);

  diffuseLightIntensity = new Float32Array(1);
  specularLightIntensity = new Float32Array(1);
  lightAttenuations = vec3.create();

  areaLightPosition = vec3.create();
  areaLightViewingPlaneNormal = vec3.create();
  areaLightViewingPlanePosition = vec3.create();
  areaLightInvertModelMatrix = mat4.create();
  areaLightExtent = vec4.create();

  constructor() {
    super();
    this.uniforms.set(
      "u_LightPosition",
      new Uniform(UniformType.FloatVector3, this.areaLightPosition)
    );
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
    this.uniforms.set(
      "u_SpecularLightShininessExponent",
      new Uniform(UniformType.FloatVector1, this.specularLightShininessExponent)
    );
    this.uniforms.set(
      "u_AmbientReflection",
      new Uniform(UniformType.FloatVector3, this.ambientReflection)
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
      "u_AreaLightViewingPlaneNormal",
      new Uniform(UniformType.FloatVector3, this.areaLightViewingPlaneNormal)
    );
    this.uniforms.set(
      "u_AreaLightViewingPlanePosition",
      new Uniform(UniformType.FloatVector3, this.areaLightViewingPlanePosition)
    );
    this.uniforms.set(
      "u_AreaLightInvertModelMatrix",
      new Uniform(UniformType.Mat4, this.areaLightInvertModelMatrix)
    );
    this.uniforms.set(
      "u_AreaLightExtent",
      new Uniform(UniformType.FloatVector4, this.areaLightExtent)
    );

    this.calculateAreaLight();
  }

  calculateAreaLight() {
    const lightPosition = vec3.fromValues(0, 0, 0);
    const lightPlaneNormal = vec3.fromValues(0, 0, 1);
    const lightPlaneDistance = 1;
    const forward = vec3.scale(vec3.create(), lightPlaneNormal, lightPlaneDistance);
    const lightPlanePosition = vec3.add(vec3.create(), lightPosition, forward);
    const lightModelMatrix = mat4.fromRotationTranslation(
      mat4.create(),
      quat.fromEuler(quat.create(), 0, 180, 30),
      vec3.fromValues(0.8, 0, 4)
    );
    const lightInvertModelMatrix = mat4.invert(mat4.create(), lightModelMatrix);
    const lightNormalMatrix = mat4.transpose(mat4.create(), lightInvertModelMatrix);
    // transform light
    vec3.transformMat4(lightPosition, lightPosition, lightModelMatrix);
    vec3.transformMat4(lightPlanePosition, lightPlanePosition, lightModelMatrix);
    vec3.transformMat4(lightPlaneNormal, lightPlaneNormal, lightNormalMatrix);
    vec3.normalize(lightPlaneNormal, lightPlaneNormal);
    // set value
    vec3.copy(this.areaLightPosition, lightPosition);
    vec3.copy(this.areaLightViewingPlanePosition, lightPlanePosition);
    vec3.copy(this.areaLightViewingPlaneNormal, lightPlaneNormal);
    mat4.copy(this.areaLightInvertModelMatrix, lightInvertModelMatrix);
  }
}

const areaLight = new AreaLight();

/**
 * Create sphere object and set uniforms
 */
const sphere = new Sphere(2, 24);
sphere.material = areaLight;

/**
 * Create scene
 */
const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(0, 0, -1),
  })
);

const axes = new Axes(4);
axes.addChild(sphere);

scene.root.addChild(axes);

scene.renderFrame();

/**
 * Setups diffuse light color
 */
watchInputs(["ambientColorR", "ambientColorG", "ambientColorB"], ([r, g, b]) => {
  vec3.set(areaLight.ambientLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(areaLight.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(areaLight.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
/**
 * Setups diffuse light intensity
 */
watchInput("diffuseIntensity", (value) => {
  areaLight.diffuseLightIntensity[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups specular light intensity
 */
watchInput("specularIntensity", (value) => {
  areaLight.specularLightIntensity[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups light attenuations
 */
watchInputs(["attenuationA", "attenuationB", "attenuationC"], ([a, b, c]) => {
  vec3.set(areaLight.lightAttenuations, parseFloat(a), parseFloat(b), parseFloat(c));
  scene.renderFrame();
});
/**
 * Setups specular light shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  areaLight.specularLightShininessExponent[0] = parseFloat(value);
  scene.renderFrame();
});
/**
 * Setups area light extent
 */
watchInputs(["areaLightWidth", "areaLightHeight"], ([width, height]) => {
  vec4.set(
    areaLight.areaLightExtent,
    -parseFloat(width) / 2,
    -parseFloat(height) / 2,
    parseFloat(width) / 2,
    parseFloat(height) / 2
  );
  scene.renderFrame();
});
