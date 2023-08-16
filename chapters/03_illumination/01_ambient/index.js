import { glMatrix, mat4, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { UniformType } from "../../libs/Constants";
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
import { Axes } from "../../libs/geom/Axes";

class AmbientLight extends Material {
  name() {
    return "AmbientLight";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      uniform mat4 u_MvpMatrix;

      // reflection of ambient light
      attribute vec3 a_AmbientReflection;
      // ambient light color
      uniform vec3 u_AmbientLightColor;
    
      varying vec3 v_Color;
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Color = a_AmbientReflection * u_AmbientLightColor;
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
      new MaterialAttributeBinding("a_AmbientReflection"),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new MaterialUniformBinding("u_AmbientLightColor"),
    ];
  }

  ambientLightColor = vec3.create();

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
      "u_AmbientLightColor",
      new Uniform(UniformType.FloatVector3, this.ambientLightColor)
    );
    this.attributes.set(
      "a_AmbientReflection",
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

const ambientLight = new AmbientLight();

const cube = new IndexedCube(2);
cube.material = ambientLight;

const axes = new Axes(2);
axes.addChild(cube);

scene.root.addChild(axes);

const dps = glMatrix.toRadian(20); // Radians Per Second
scene.event.addEventListener("prerender", (event) => {
  /**@type {import("../../libs/WebGLRenderer").FrameState} */
  const frameState = event.frameState;
  let r = (frameState.previousTime / 1000) * dps;
  r %= 360;
  cube.setModelMatrix(mat4.fromYRotation(cube.modelMatrix, r));
});

scene.startRendering();

/**
 * Setups ambient light color
 */
watchInputs(["ambientColorR", "ambientColorG", "ambientColorB"], ([r, g, b]) => {
  vec3.set(ambientLight.ambientLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
