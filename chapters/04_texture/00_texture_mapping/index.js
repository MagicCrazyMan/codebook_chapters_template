import { mat4, quat, vec3 } from "gl-matrix";
import { BufferAttribute, BufferDescriptor } from "../../libs/Attribute";
import { Scene } from "../../libs/Scene";
import { getCanvas, watchInput, watchInputs } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { EntityAttributeNames, EntityUniformNames } from "../../libs/entity/RenderEntity";
import { Axes } from "../../libs/geom/Axes";
import { IndexedCube } from "../../libs/geom/Cube";
import { Plane } from "../../libs/geom/Plane";
import {
  EntityAttributeBinding,
  EntityUniformBinding,
  Material,
  MaterialUniformBinding,
} from "../../libs/material/Material";
import { Uniform } from "../../libs/Uniform";
import { UniformType } from "../../libs/Constants";

class TextureMapping extends Material {
  name() {
    return "TextureMapping";
  }

  vertexShaderSource() {
    return `
      attribute vec4 a_Position;
      attribute vec2 a_TexCoord;

      uniform mat4 u_MvpMatrix;
      uniform bool u_UseMvpTexCoord;

      varying vec2 v_TexCoord;
      varying vec2 v_MvpTexCoord;

      void main() {
        gl_Position = u_MvpMatrix * a_Position;

        if (u_UseMvpTexCoord) {
          v_MvpTexCoord = vec2(gl_Position);
        } else {
          v_TexCoord = a_TexCoord;
        }
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

      uniform sampler2D u_Sampler;
      uniform bool u_UseMvpTexCoord;

      varying vec2 v_TexCoord;
      varying vec2 v_MvpTexCoord;

      void main() {
        if (u_UseMvpTexCoord) {
          gl_FragColor = texture2D(u_Sampler, v_MvpTexCoord);
        } else {
          gl_FragColor = texture2D(u_Sampler, v_TexCoord);
        }
      }
    `;
  }

  attributesBindings() {
    return [
      new EntityAttributeBinding(EntityAttributeNames.Position),
      new EntityAttributeBinding(EntityAttributeNames.TexCoord),
    ];
  }

  uniformBindings() {
    return [
      new EntityUniformBinding(EntityUniformNames.MvpMatrix),
      new MaterialUniformBinding("u_Sampler", false),
      new MaterialUniformBinding("u_UseMvpTexCoord"),
    ];
  }

  /**
   * Image
   * @type {Uint8Array}
   */
  image;

  /**
   * Image width
   * @type {number}
   */
  imageWidth;

  /**
   * Image height
   * @type {number}
   */
  imageHeight;

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

  /**
   * Texture s wrapping method
   * @type {string}
   */
  wrapS = "REPEAT";

  /**
   * Texture s wrapping method
   * @type {string}
   */
  wrapT = "REPEAT";

  /**
   * Sample texture using Model-View transformed position
   * @type {boolean}
   */
  useMvpTexCoord = new Uint8Array(1)

  /**
   * Constructs a texture mapping material.
   * @param {Uint8Array} image
   * @param {number} imageWidth
   * @param {number} imageHeight
   */
  constructor(image, imageWidth, imageHeight) {
    super();

    this.image = image;
    this.imageWidth = imageWidth;
    this.imageHeight = imageHeight;

    this.uniforms.set("u_UseMvpTexCoord", new Uniform(UniformType.IntVector1, this.useMvpTexCoord))
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
      // create texture
      const texture = gl.createTexture();
      // binds texture
      gl.bindTexture(gl.TEXTURE_2D, texture);
      // tells webgl flip Y axis when unpacking image data
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      // format and buffer image data to texture
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        this.imageWidth,
        this.imageHeight,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        this.image
      );
      // generate mipmap for texture
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.bindTexture(gl.TEXTURE_2D, null);

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

    const glWrap = (gl, value) => {
      if (value === "0") {
        return gl.REPEAT;
      } else if (value === "1") {
        return gl.MIRRORED_REPEAT;
      } else if (value === "2") {
        return gl.CLAMP_TO_EDGE;
      } else {
        return gl.REPEAT;
      }
    };

    // binds texture before drawing
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    // setups texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, glFilter(gl, this.magnificationFilter));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, glFilter(gl, this.minificationFilter));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, glWrap(gl, this.wrapT));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, glWrap(gl, this.wrapS));
    // active texture unit 0
    gl.activeTexture(gl.TEXTURE0);
    // tells webgl sampler named u_Sampler should use texture in unit 0
    gl.uniform1i(uniforms.get("u_Sampler").location, 0);
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

const scene = new Scene(getCanvas());
scene.addControl(new BlenderCamera({ radius: 5, direction: vec3.fromValues(-1, -1, -1) }));
scene.root.addChild(new Axes(3));

/**
 * Cube
 */
let cubeTextureMapping; // material will be create in watchInputs
const cube = new IndexedCube(3);
// prettier-ignore
cube.attributes.set("a_TexCoord", new BufferAttribute(new BufferDescriptor(new Float32Array([
  1.5, 1.5,  -0.5, 1.5,  -0.5, -0.5,  1.5, -0.5,
  1.5, 1.5,  -0.5, 1.5,  -0.5, -0.5,  1.5, -0.5,
  1.5, 1.5,  -0.5, 1.5,  -0.5, -0.5,  1.5, -0.5,
  1.5, 1.5,  -0.5, 1.5,  -0.5, -0.5,  1.5, -0.5,
  1.5, 1.5,  -0.5, 1.5,  -0.5, -0.5,  1.5, -0.5,
  1.5, 1.5,  -0.5, 1.5,  -0.5, -0.5,  1.5, -0.5,
])), 2));
scene.root.addChild(cube);

/**
 * Plane
 */
let planeTextureMapping; // material will be create in watchInputs
const plane = new Plane(40, 100000);
plane.setModelMatrix(
  mat4.fromRotationTranslation(
    mat4.create(),
    quat.fromEuler(quat.create(), 90, 0, 0),
    vec3.fromValues(0, -2, 0)
  )
);
// prettier-ignore
plane.attributes.set("a_TexCoord", new BufferAttribute(new BufferDescriptor(new Float32Array([
  1, 1,  0, 1,  0, 0,
  1, 1,  0, 0,  1, 0,
])), 2));
scene.root.addChild(plane);

scene.renderFrame();

/**
 * Creates grid image.
 * @param {number} blockSize Pixel size of each grid block.
 * @param {number} rows Rows size.
 * @param {number} cols Cols size.
 * @returns {{ image: Uint8Array, width: number, height: number }} Image.
 */
const createGridImage = (blockSize = 64, rows = 4, cols = 4) => {
  const rowsInPixel = rows * blockSize;
  const colsInPixel = cols * blockSize;
  const image = new Uint8Array(rowsInPixel * colsInPixel * 3);
  for (let row = 0; row < rowsInPixel; row++) {
    const oddEvenRow = Math.floor(row / blockSize) % 2;
    for (let col = 0; col < cols; col++) {
      const oddEvenCol = col % 2;

      const pixel = (oddEvenRow + oddEvenCol) % 2 === 0 ? 0 : 255;
      const startIndex = (row * colsInPixel + col * blockSize) * 3;
      const endIndex = startIndex + blockSize * 3;
      image.fill(pixel, startIndex, endIndex);
    }
  }

  return { image, width: blockSize * cols, height: blockSize * rows };
};

/**
 * Setups image texture of cube
 */
watchInputs(["cubeGridSize", "cubeGridRows", "cubeGridCols"], ([size, rows, cols]) => {
  const { image, width, height } = createGridImage(parseInt(size), parseInt(rows), parseInt(cols));
  cubeTextureMapping = new TextureMapping(image, width, height);
  cubeTextureMapping.magnificationFilter = document.getElementById("cubeMagnification").value;
  cubeTextureMapping.minificationFilter = document.getElementById("cubeMinification").value;
  cubeTextureMapping.wrapS = document.getElementById("cubeWrapS").value;
  cubeTextureMapping.wrapT = document.getElementById("cubeWrapT").value;
  cubeTextureMapping.useMvpTexCoord[0] = document.getElementById("cubeUseMvpTextureCoords").checked ? 1 : 0;
  cube.material = cubeTextureMapping;

  scene.renderFrame();
});
/**
 * Setups magnification filter method of cube
 */
watchInput("cubeMagnification", (value) => {
  cubeTextureMapping.magnificationFilter = value;
  scene.renderFrame();
});
/**
 * Setups minification filter method of cube
 */
watchInput("cubeMinification", (value) => {
  cubeTextureMapping.minificationFilter = value;
  scene.renderFrame();
});
/**
 * Setups wrap S of cube
 */
watchInput("cubeWrapS", (value) => {
  cubeTextureMapping.wrapS = value;
  scene.renderFrame();
});
/**
 * Setups wrap T of cube
 */
watchInput("cubeWrapT", (value) => {
  cubeTextureMapping.wrapT = value;
  scene.renderFrame();
});

/**
 * Setups image texture of plane
 */
watchInputs(["planeGridSize", "planeGridCols"], ([size, cols]) => {
  const { image, width, height } = createGridImage(parseInt(size), 1, parseInt(cols));
  planeTextureMapping = new TextureMapping(image, width, height);
  planeTextureMapping.magnificationFilter = document.getElementById("planeMagnification").value;
  planeTextureMapping.minificationFilter = document.getElementById("planeMinification").value;
  cubeTextureMapping.useMvpTexCoord[0] = document.getElementById("planeUseMvpTextureCoords").checked ? 1 : 0;
  plane.material = planeTextureMapping;

  scene.renderFrame();
});
/**
 * Setups magnification filter method of plane
 */
watchInput("planeMagnification", (value) => {
  planeTextureMapping.magnificationFilter = value;
  scene.renderFrame();
});
/**
 * Setups minification filter method of plane
 */
watchInput("planeMinification", (value) => {
  planeTextureMapping.minificationFilter = value;
  scene.renderFrame();
});
/**
 * Setups MVP texture coord of cube
 */
watchInput("cubeUseMvpTextureCoords", (checked) => {
  cubeTextureMapping.useMvpTexCoord[0] = checked ? 1 : 0
  scene.renderFrame();
});
/**
 * Setups MVP texture coord of plane
 */
watchInput("planeUseMvpTextureCoords", (checked) => {
  planeTextureMapping.useMvpTexCoord[0] = checked ? 1 : 0
  scene.renderFrame();
});
