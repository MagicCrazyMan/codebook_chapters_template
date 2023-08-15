import { glMatrix, quat, vec3 } from "gl-matrix";
import { CullFace, DrawMode, UniformType } from "../../../libs/Constants";
import { Scene } from "../../../libs/Scene";
import { Uniform } from "../../../libs/Uniform";
import { PerspectiveCamera } from "../../../libs/camera/Perspective";
import { getCanvas, watchInputs } from "../../../libs/common";
import { EntityAttributeNames, EntityUniformNames } from "../../../libs/entity/RenderEntity";
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

  drawMode() {
    return DrawMode.Triangles;
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

const canvas = getCanvas();
const scene = new Scene(canvas, {
  cullFace: CullFace.Back,
  camera: new PerspectiveCamera(
    glMatrix.toRadian(30),
    canvas.width / canvas.height,
    1,
    1000,
    vec3.fromValues(3, 3, 7)
  ),
});

const ambientLight = new AmbientLight();

const cube = new Sphere(2, 24);
cube.material = ambientLight;
scene.root.addChild(cube);

const dps = 20; // Degrees Per Second
const rotation = quat.create();
scene.event.addEventListener("prerender", (event) => {
  /**@type {import("../../libs/WebGLRenderer").FrameState} */
  const frameState = event.frameState;
  let r = (frameState.previousTime / 1000) * dps;
  r %= 360;
  cube.setRotationQuaternion(quat.fromEuler(rotation, 0, r, 0), true);
});

/**
 * Setups ambient light color
 */
watchInputs(["ambientColorR", "ambientColorG", "ambientColorB"], ([r, g, b]) => {
  vec3.set(ambientLight.ambientLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
  scene.renderFrame();
});
