import { vec3 } from "gl-matrix";
import { UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { Uniform } from "../../../libs/Uniform";
import { colorToFloat, getCanvas, watchInput } from "../../../libs/common";
import { BlenderCamera } from "../../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
import { Axes } from "../../../libs/geom/Axes";
import { Sphere } from "../../../libs/geom/Sphere";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../../libs/material/Material";

class AmbientLight extends Material {
  name() {
    return "AmbientLight";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      uniform mat4 u_MvpMatrix;

      uniform vec3 u_AmbientReflection;
      uniform vec3 u_AmbientLightColor;
    
      varying vec3 v_Color;
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Color = u_AmbientReflection * u_AmbientLightColor;
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
    
      varying vec3 v_Color;
    
      void main() {
        gl_FragColor = vec4(v_Color, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [new EntityAttributeBinding(EntityAttributeNames.Position)];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new MaterialUniformBinding("u_AmbientLightColor"),
      new MaterialUniformBinding("u_AmbientReflection"),
    ];
  }

  ambientLightColor = vec3.create();
  ambientReflection = vec3.fromValues(0.4, 0.4, 1);

  constructor() {
    super();
    this.uniforms.set(
      "u_AmbientLightColor",
      new Uniform(UniformType.FloatVector3, this.ambientLightColor)
    );
    this.uniforms.set(
      "u_AmbientReflection",
      new Uniform(UniformType.FloatVector3, this.ambientReflection)
    );
  }
}

const ambientLight = new AmbientLight();

/**
 * Create sphere object
 */
const sphere = new Sphere(2, 24);
sphere.material = ambientLight;

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

scene.renderFrame();

/**
 * Setups ambient light color
 */
watchInput("ambientLightColor", (color) => {
  const [r, g, b] = colorToFloat(color);
  vec3.set(ambientLight.ambientLightColor, r, g, b);
  scene.renderFrame();
});