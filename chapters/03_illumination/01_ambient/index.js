import { glMatrix, mat4, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { UniformType } from "../../libs/Constants";
import { Scene } from "../../libs/Scene";
import { Uniform } from "../../libs/Uniform";
import { colorToFloat, getCanvas, watchInput } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { Axes } from "../../libs/geom/Axes";
import { IndexedCube } from "../../libs/geom/Cube";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialAttributeBinding,
  MaterialUniformBinding,
} from "../../libs/material/Material";

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

scene.root.addChild(cube);
scene.root.addChild(new Axes(2));

let enableRotation = true;
let rotationSpeed = 0;
scene.event.addEventListener("prerender", (event) => {
  if (!enableRotation) return;

  /**@type {import("../../libs/WebGLRenderer").FrameState} */
  const frameState = event.frameState;
  const r = ((frameState.time - frameState.previousTime) / 1000) * rotationSpeed;
  cube.setModelMatrix(mat4.rotateY(cube.modelMatrix, cube.modelMatrix, r));
});

scene.startRendering();

/**
 * Setups rotation
 */
watchInput("enableRotation", (checked) => {
  enableRotation = checked;
});
watchInput("rotationSpeed", (speed) => {
  rotationSpeed = glMatrix.toRadian(parseFloat(speed));
});
/**
 * Setups ambient light color
 */
watchInput("ambientLightColor", (color) => {
  const [r, g, b] = colorToFloat(color);
  vec3.set(ambientLight.ambientLightColor, r, g, b);
});
