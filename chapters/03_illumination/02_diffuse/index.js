import { quat, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { DrawMode, UniformType } from "../../libs/Constants";
import { Scene } from "../../libs/Scene";
import { Uniform } from "../../libs/Uniform";
import { getCanvas, watchInputs } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { IndexedCube } from "../../libs/geom/Cube";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialAttributeBinding,
  MaterialUniformBinding,
} from "../../libs/material/Material";

class DiffuseLight extends Material {
  name() {
    return "DiffuseLight";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Normal;
    
      attribute vec3 a_DiffuseReflection;
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_NormalMatrix;
      uniform vec3 u_DiffuseLightColor;
      uniform vec3 u_LightDirection;
    
      varying vec3 v_Color;
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        vec4 normal = u_NormalMatrix * a_Normal;
        float power = max(dot(u_LightDirection, normalize(normal.xyz)), 0.0);
        v_Color = a_DiffuseReflection * u_DiffuseLightColor * power;
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
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.Normal),
      new MaterialAttributeBinding("a_DiffuseReflection"),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new MaterialUniformBinding("u_DiffuseLightColor"),
      new MaterialUniformBinding("u_LightDirection"),
    ];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  diffuseLightColor = vec3.create();

  lightDirection = vec3.normalize(vec3.create(), vec3.fromValues(0.5, 3.0, 4.0));

  // prettier-ignore
  cubeFaceReflections = new Float32Array([
    0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  // front(blue)
    1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  // up(red)
    0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  // back(cyan)
    1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  // bottom(white)
    1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  // left(yellow)
    0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  // right(green)
  ]);

  constructor() {
    super();
    this.uniforms.set(
      "u_DiffuseLightColor",
      new Uniform(UniformType.FloatVector3, this.diffuseLightColor)
    );
    this.uniforms.set(
      "u_LightDirection",
      new Uniform(UniformType.FloatVector3, this.lightDirection)
    );
    this.attributes.set(
      "a_DiffuseReflection",
      new BufferAttribute(new BufferDescriptor(this.cubeFaceReflections), 3)
    );
  }
}

const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(-1, -1, -1),
  })
);

const diffuseLight = new DiffuseLight();

const cube = new IndexedCube(2);
cube.material = diffuseLight;
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

scene.startRendering();

/**
 * Setups diffuse light color
 */
watchInputs(["diffuseColorR", "diffuseColorG", "diffuseColorB"], ([r, g, b]) => {
  vec3.set(diffuseLight.diffuseLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
