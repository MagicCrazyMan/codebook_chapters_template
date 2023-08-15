import { glMatrix, quat, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { CullFace, DrawMode, UniformType } from "../../libs/Constants";
import { Scene } from "../../libs/Scene";
import { Uniform } from "../../libs/Uniform";
import { CameraUniformNames } from "../../libs/camera/Camera";
import { PerspectiveCamera } from "../../libs/camera/Perspective";
import { getCanvas, watchInput, watchInputs } from "../../libs/common";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { IndexedCube } from "../../libs/geom/Cube";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialAttributeBinding,
  MaterialUniformBinding,
} from "../../libs/material/Material";

class SpecularLight extends Material {
  name() {
    return "SpecularLight";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec4 a_Normal;
    
      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;
      uniform mat4 u_NormalMatrix;
    
      attribute vec3 a_SpecularReflection;
      varying vec3 v_SpecularReflection;
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_Normal = vec3(u_NormalMatrix * a_Normal);
        v_SpecularReflection = a_SpecularReflection;
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
    
      varying vec3 v_SpecularReflection;

      uniform vec3 u_LightPosition;
      uniform vec3 u_SpecularLightColor;
      uniform float u_SpecularLightShininessExponent;
    
      uniform vec3 u_CameraPosition;
    
      varying vec3 v_Normal;
      varying vec3 v_Position;
    
      void main() {
        // normalizes normal vector
        vec3 normal = normalize(v_Normal);
        // calculates light direction
        vec3 lightDirection = normalize(u_LightPosition - v_Position);
        // calculates reflection direction
        vec3 reflectionDirection = 2.0 * normal * dot(normal, lightDirection) - lightDirection;
        reflectionDirection = normalize(reflectionDirection);
    
        // calculates vector from object position to camera and normalize
        vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
        // calculates cosine angle between r and v
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        // calculates specular power
        float power = pow(cosine, u_SpecularLightShininessExponent);
    
        // calculates specular light color
        vec3 color = v_SpecularReflection * u_SpecularLightColor * power;
    
        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.Normal),
      new MaterialAttributeBinding("a_SpecularReflection"),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new MaterialUniformBinding("u_LightPosition"),
      new MaterialUniformBinding("u_SpecularLightColor"),
      new MaterialUniformBinding("u_SpecularLightShininessExponent"),
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  drawMode() {
    return DrawMode.Triangles;
  }

  specularLightColor = vec3.create();
  specularLightShininessExponent = new Float32Array(1);

  lightPosition = vec3.fromValues(5, -2, 5);

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
      "u_SpecularLightColor",
      new Uniform(UniformType.FloatVector3, this.specularLightColor)
    );
    this.uniforms.set(
      "u_SpecularLightShininessExponent",
      new Uniform(UniformType.FloatVector1, this.specularLightShininessExponent)
    );
    this.uniforms.set("u_LightPosition", new Uniform(UniformType.FloatVector3, this.lightPosition));

    this.attributes.set(
      "a_SpecularReflection",
      new BufferAttribute(new BufferDescriptor(this.cubeFaceReflections), 3)
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
    vec3.fromValues(6, 6, 14)
  ),
});

const specularLight = new SpecularLight();

const cube = new IndexedCube(4, 4, 4);
cube.material = specularLight;
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
 * Setups specular light color
 */
watchInputs(["specularColorR", "specularColorG", "specularColorB"], ([r, g, b]) => {
  vec3.set(specularLight.specularLightColor, parseFloat(r), parseFloat(g), parseFloat(b));
});
/**
 * Setups light specular shininess exponent
 */
watchInput("specularShininessExponent", (value) => {
  specularLight.specularLightShininessExponent[0] = parseFloat(value);
});
