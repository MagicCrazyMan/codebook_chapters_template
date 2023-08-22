import { vec3 } from "gl-matrix";
import { Scene } from "../../libs/Scene";
import { CameraUniformNames } from "../../libs/camera/Camera";
import { getCanvas, watchInput } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { Axes } from "../../libs/geom/Axes";
import { Sphere } from "../../libs/geom/Sphere";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  MainCameraUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../libs/material/Material";

class EnvironmentMapping extends Material {
  name() {
    return "EnvironmentMapping";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;

      uniform mat4 u_ModelMatrix;
      uniform mat4 u_MvpMatrix;

      varying vec3 v_Position;

      void main() {
        gl_Position = u_MvpMatrix * a_Position;
        v_Position = vec3(u_ModelMatrix * a_Position);
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

      uniform vec3 u_CameraPosition;
      uniform samplerCube u_CubeMapSampler;

      varying vec3 v_Position;

      void main() {
        vec3 normal = normalize(v_Position);  // position of sphere can be used as normal after normalized
        vec3 incident = v_Position - u_CameraPosition;
        vec3 reflection = reflect(incident, normal);
        gl_FragColor = textureCube(u_CubeMapSampler, reflection);
      }
    `;
  }

  attributesBindings() {
    return [new EntityAttributeBinding(EntityAttributeNames.Position)];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new EntityUniformBinding(EntityUniformNames.ModelMatrix),
      new MainCameraUniformBinding(CameraUniformNames.Position),
      new MaterialUniformBinding("u_CubeMapSampler", false),
    ];
  }

  /**
   * Cube map texture images
   * @type {HTMLImageElement[]}
   * @readonly
   */
  cubeImages;

  /**
   * Texture magnification filter method
   * @type {string}
   */
  magnificationFilter = "NEAREST";

  /**
   * Texture minification filter method
   * @type {string}
   */
  minificationFilter = "NEAREST";

  constructor(cubeImages) {
    super();
    this.cubeImages = cubeImages;
  }

  _texture;

  /**
   *
   * @param {import("../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialAttribute>} attributes
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialUniform>} uniforms
   * @param {import("../../libs/WebGLRenderer").FrameState} frameState
   */
  prerender(entity, attributes, uniforms, { gl }) {
    if (!this._texture) {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_X,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.cubeImages[0]
      );
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.cubeImages[1]
      );
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.cubeImages[2]
      );
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.cubeImages[3]
      );
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.cubeImages[4]
      );
      gl.texImage2D(
        gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
        0,
        gl.RGB,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.cubeImages[5]
      );
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);

      this._texture = texture;
    }

    const glFilter = (gl, value) => {
      if (value === "0") {
        return gl.NEAREST;
      } else if (value === "1") {
        return gl.LINEAR;
      } else if (value === "2") {
        return gl.NEAREST_MIPMAP_NEAREST;
      } else if (value === "3") {
        return gl.NEAREST_MIPMAP_LINEAR;
      } else if (value === "4") {
        return gl.LINEAR_MIPMAP_NEAREST;
      } else if (value === "5") {
        return gl.LINEAR_MIPMAP_LINEAR;
      } else {
        return gl.NEAREST;
      }
    };

    // binds texture before drawing
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this._texture);
    // setups texture parameters
    gl.texParameteri(
      gl.TEXTURE_CUBE_MAP,
      gl.TEXTURE_MAG_FILTER,
      glFilter(gl, this.magnificationFilter)
    );
    gl.texParameteri(
      gl.TEXTURE_CUBE_MAP,
      gl.TEXTURE_MIN_FILTER,
      glFilter(gl, this.minificationFilter)
    );
    // active texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // tells webgl sampler named u_Sampler should use texture in unit 0
    gl.uniform1i(uniforms.get("u_CubeMapSampler").location, 0);
  }

  /**
   *
   * @param {import("../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialAttribute>} attributes
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialUniform>} uniforms
   * @param {import("../../libs/WebGLRenderer").FrameState} frameState
   */
  postrender(entity, attributes, uniforms, { gl }) {
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
  }
}

const scene = new Scene(getCanvas());
scene.addControl(new BlenderCamera({ radius: 5, direction: vec3.fromValues(-1, -1, -1) }));
scene.root.addChild(new Axes(2));

let environmentMapping;
const sphere = new Sphere(1, 24, 48);
scene.root.addChild(sphere);

scene.renderFrame();

/**
 * Loads cube images
 */
await Promise.all([
  fetch("/resources/skybox/skybox_px.jpg").then((r) => r.blob()),
  fetch("/resources/skybox/skybox_py.jpg").then((r) => r.blob()),
  fetch("/resources/skybox/skybox_pz.jpg").then((r) => r.blob()),
  fetch("/resources/skybox/skybox_nx.jpg").then((r) => r.blob()),
  fetch("/resources/skybox/skybox_ny.jpg").then((r) => r.blob()),
  fetch("/resources/skybox/skybox_nz.jpg").then((r) => r.blob()),
])
  .then((blobs) => {
    const promises = blobs.map((blob) => {
      const image = new Image();
      image.src = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        image.onload = () => {
          resolve(image);
        };
      });
    });

    return Promise.all(promises);
  })
  .then((images) => {
    environmentMapping = new EnvironmentMapping(images);
    environmentMapping.magnificationFilter = document.getElementById(
      "environmentMagnification"
    ).value;
    environmentMapping.minificationFilter =
      document.getElementById("environmentMinification").value;
    sphere.material = environmentMapping;
    scene.renderFrame();
  });

/**
 * Setups magnification filter method of cube
 */
watchInput("environmentMagnification", (value) => {
  environmentMapping.magnificationFilter = value;
  scene.renderFrame();
});
/**
 * Setups minification filter method of cube
 */
watchInput("environmentMinification", (value) => {
  environmentMapping.minificationFilter = value;
  scene.renderFrame();
});
