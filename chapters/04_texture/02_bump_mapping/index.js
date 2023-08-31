import { glMatrix, mat4, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { UniformType } from "../../libs/Constants";
import { Scene } from "../../libs/Scene";
import { Uniform } from "../../libs/Uniform";
import { CameraUniformNames } from "../../libs/camera/Camera";
import { colorToFloat, getCanvas, watchInput, watchInputs } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { Axes } from "../../libs/geom/Axes";
import { IndexedCube } from "../../libs/geom/Cube";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../libs/material/Material";

class BumpMapping extends Material {
  name() {
    return "BumpMapping";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec2 a_TexCoord;
      attribute float a_FaceId;
      
      uniform vec3 u_AmbientReflection;

      uniform mat4 u_MvpMatrix;
      uniform mat4 u_ModelMatrix;

      uniform vec3 u_AmbientLightColor;

      varying vec3 v_AmbientColor;

      varying vec3 v_Normal;
      varying vec3 v_Position;
      varying vec2 v_TexCoord;
      varying mat4 v_TangentSpaceMatrix;
      varying float v_FaceId;

      /**
       * Calculates ambient reflection color
       */
      vec3 ambient() {
        return u_AmbientLightColor * u_AmbientReflection;
      }

      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
        v_TexCoord = a_TexCoord;
        v_FaceId = a_FaceId;

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

      uniform sampler2D u_BumpMappingSampler;
      uniform mat4 u_NormalMatrix;
      uniform mat4 u_TangentSpaceMatrices[6];
    
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
    
      varying vec3 v_Position;
      varying vec2 v_TexCoord;
      varying float v_FaceId;
    
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
      vec3 specular(float attenuation, vec3 reflectionDirection, vec3 cameraDirection) {
        float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
        float power = pow(cosine, u_SpecularLightShininessExponent);
        return attenuation * u_SpecularLightIntensity * u_SpecularLightColor * u_SpecularReflection * power;
      }
    
      void main() {
        mat4 tangentSpaceMatrix;
        int faceId = int(v_FaceId);
        if (faceId == 0) {
          tangentSpaceMatrix = u_TangentSpaceMatrices[0];
        } else if (faceId == 1) {
          tangentSpaceMatrix = u_TangentSpaceMatrices[1];
        } else if (faceId == 2) {
          tangentSpaceMatrix = u_TangentSpaceMatrices[2];
        } else if (faceId == 3) {
          tangentSpaceMatrix = u_TangentSpaceMatrices[3];
        } else if (faceId == 4) {
          tangentSpaceMatrix = u_TangentSpaceMatrices[4];
        } else {
          tangentSpaceMatrix = u_TangentSpaceMatrices[5];
        }
        vec4 N = texture2D(u_BumpMappingSampler, v_TexCoord);
        N = normalize(2.0 * N - 1.0);
        N = u_NormalMatrix * tangentSpaceMatrix * N;
        vec3 normal = vec3(N);

        vec3 lightDirection = normalize(u_LightPosition - v_Position);
        vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
        vec3 reflectionDirection = reflect(-lightDirection, normal);
    
        float distanceToLight = distance(v_Position, u_LightPosition);
        float distanceToCamera = distance(v_Position, u_CameraPosition);
        float attenuationDistance = distanceToLight + distanceToCamera;
        float attenuationComponent = u_LightAttenuations.x + u_LightAttenuations.y * attenuationDistance + u_LightAttenuations.z * pow(attenuationDistance, 2.0);
        float attenuation = attenuationComponent == 0.0 ? 1.0 : 1.0 / attenuationComponent;
        
        vec3 diffuseColor = diffuse(attenuation, normal, lightDirection);
        vec3 specularColor = specular(attenuation, reflectionDirection, cameraDirection);
    
        gl_FragColor = vec4(v_AmbientColor + diffuseColor + specularColor, 1.0);
      }
    `;
  }

  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.TexCoord),
      new EntityAttributeBinding("a_FaceId"),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new EntityUniformBinding(EntityUniformNames.NormalMatrix),
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new EntityUniformBinding("u_TangentSpaceMatrices"),
      new MaterialUniformBinding("u_BumpMappingSampler", false),
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
      new MainCameraUniformBinding(CameraUniformNames.Position),
    ];
  }

  /**
   * Bump mapping image
   * @type {TexImageSource}
   * @readonly
   */
  bumpImage;

  lightPosition = vec3.create();
  ambientLightColor = vec3.create();
  diffuseLightColor = vec3.create();
  specularLightColor = vec3.create();

  ambientReflection = vec3.fromValues(1, 1, 1);
  diffuseReflection = vec3.fromValues(1, 1, 1);
  specularReflection = vec3.fromValues(1, 1, 1);
  specularLightShininessExponent = new Float32Array(1);

  diffuseLightIntensity = new Float32Array(1);
  specularLightIntensity = new Float32Array(1);

  lightAttenuations = vec3.create();

  constructor(bumpImage) {
    super();
    this.bumpImage = bumpImage;
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
  }

  rps = glMatrix.toRadian(20);
  lightBasePosition = vec3.fromValues(0, 5, 5);
  lightPositionModelMatrix = mat4.create();

  /**
   * @readonly
   */
  _texture;

  /**
   *
   * @param {import("../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialAttribute>} attributes
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialUniform>} uniforms
   * @param {import("../../libs/WebGLRenderer").FrameState} frameState
   */
  prerender(entity, attributes, uniforms, { time, previousTime, gl }) {
    if (!this._texture) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, this.bumpImage);
      gl.bindTexture(gl.TEXTURE_2D, null);
      this._texture = texture;
    }

    /**
     * Binds bump mapping texture
     */
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(uniforms.get("u_BumpMappingSampler").location, 0);

    /**
     * Rotates light position per frame
     */
    const rotationOffset = ((time - previousTime) / 1000) * this.rps;
    mat4.rotateY(this.lightPositionModelMatrix, this.lightPositionModelMatrix, rotationOffset);
    vec3.transformMat4(this.lightPosition, this.lightBasePosition, this.lightPositionModelMatrix);
  }

  /**
   *
   * @param {import("../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialAttribute>} attributes
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialUniform>} uniforms
   * @param {import("../../libs/WebGLRenderer").FrameState} frameState
   */
  postrender(entity, attributes, uniforms, { gl }) {
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

/**
 * Creates transform matrix from tangent space to texture space
 * @param {import("gl-matrix").ReadonlyVec3} normal Normal vector of tangent space
 * @param {import("gl-matrix").ReadonlyVec3} tangent Tangent vector in tangent space
 * @returns {mat4} Transform matrix from tangent space to texture space
 */
const createTangentSpaceMatrix = (normal, tangent) => {
  const N = vec3.normalize(vec3.create(), normal);
  const T = vec3.normalize(vec3.create(), tangent);
  const B = vec3.cross(vec3.create(), N, T);
  vec3.normalize(B, B);
  // prettier-ignore
  const toTangentSpace = mat4.fromValues(
    T[0], B[0], N[0], 0,
    T[1], B[1], N[1], 0,
    T[2], B[2], N[2], 0,
    0, 0, 0, 1,
  );
  const fromTangentSpace = mat4.invert(toTangentSpace, toTangentSpace);
  return fromTangentSpace;
};

const cube = new IndexedCube();
// prettier-ignore
cube.attributes.set("a_TexCoord", new BufferAttribute(new BufferDescriptor(new Float32Array([
  1, 1,  0, 1,  0, 0,  1, 0,
  1, 1,  0, 1,  0, 0,  1, 0,
  0, 1,  1, 1,  1, 0,  0, 0,
  0, 1,  1, 1,  1, 0,  0, 0,
  1, 1,  0, 1,  0, 0,  1, 0,
  1, 1,  0, 1,  0, 0,  1, 0,
])), 2));

/**
 * Setups tangent space matrix for each face of cube
 */
const front = createTangentSpaceMatrix(vec3.fromValues(0, 0, 1), vec3.fromValues(1, 0, 0));
const top = createTangentSpaceMatrix(vec3.fromValues(0, 1, 0), vec3.fromValues(1, 0, 0));
const back = createTangentSpaceMatrix(vec3.fromValues(0, 0, -1), vec3.fromValues(-1, 0, 0));
const bottom = createTangentSpaceMatrix(vec3.fromValues(0, -1, 0), vec3.fromValues(-1, 0, 0));
const left = createTangentSpaceMatrix(vec3.fromValues(-1, 0, 0), vec3.fromValues(0, 0, 1));
const right = createTangentSpaceMatrix(vec3.fromValues(1, 0, 0), vec3.fromValues(0, 0, -1));
// prettier-ignore
cube.attributes.set("a_FaceId", new BufferAttribute(new BufferDescriptor(new Float32Array([
  0, 0, 0, 0,
  1, 1, 1, 1,
  2, 2, 2, 2,
  3, 3, 3, 3,
  4, 4, 4, 4,
  5, 5, 5, 5,
])), 1))
cube.uniforms.set(
  "u_TangentSpaceMatrices",
  new Uniform(
    UniformType.Mat4,
    new Float32Array([...front, ...top, ...back, ...bottom, ...left, ...right])
  )
);

/**
 * Create scene
 */
const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(-1, -1, -1),
    radius: 2,
  })
);

scene.root.addChild(cube);
scene.root.addChild(new Axes(4));

scene.startRendering();

/**
 * Loads bump mapping image
 */
fetch("/resources/normal_mapping.png")
  .then((res) => res.blob())
  .then((blob) => URL.createObjectURL(blob))
  .then(
    (url) =>
      new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          resolve(img);
        };
      })
  )
  .then((img) => {
    const bumpMapping = new BumpMapping(img);
    cube.material = bumpMapping;

    /**
     * Setups ambient light color
     */
    watchInput("ambientLightColor", (color) => {
      const [r, g, b] = colorToFloat(color);
      vec3.set(bumpMapping.ambientLightColor, r, g, b);
    });
    /**
     * Setups diffuse light color
     */
    watchInput("diffuseLightColor", (color) => {
      const [r, g, b] = colorToFloat(color);
      vec3.set(bumpMapping.diffuseLightColor, r, g, b);
    });
    /**
     * Setups specular light color
     */
    watchInput("specularLightColor", (color) => {
      const [r, g, b] = colorToFloat(color);
      vec3.set(bumpMapping.specularLightColor, r, g, b);
    });
    /**
     * Setups diffuse light intensity
     */
    watchInput("diffuseLightIntensity", (value) => {
      bumpMapping.diffuseLightIntensity[0] = parseFloat(value);
    });
    /**
     * Setups specular light intensity
     */
    watchInput("specularLightIntensity", (value) => {
      bumpMapping.specularLightIntensity[0] = parseFloat(value);
    });
    /**
     * Setups light specular shininess exponent
     */
    watchInput("specularLightShininessExponent", (value) => {
      bumpMapping.specularLightShininessExponent[0] = parseFloat(value);
    });
    /**
     * Setups light attenuations
     */
    watchInputs(["attenuationA", "attenuationB", "attenuationC"], ([a, b, c]) => {
      vec3.set(bumpMapping.lightAttenuations, parseFloat(a), parseFloat(b), parseFloat(c));
    });
  });
