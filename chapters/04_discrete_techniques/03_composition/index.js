import { mat4, vec3, vec4 } from "gl-matrix";
import { Scene } from "../../libs/Scene";
import { colorToFloat, getCanvas, watchInput } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { Axes } from "../../libs/geom/Axes";
import { IndexedCube } from "../../libs/geom/Cube";
import { PerVertexColorMaterial } from "../../libs/material/PerVertexColorMaterial";

/**
 * @enum {number} Alpha blending factors
 */
const AlphaBlendFactor = {
  One: 0,
  Zero: 1,
  SrcColor: 2,
  OneMinusSrcColor: 3,
  DstColor: 4,
  OneMinusDstColor: 5,
  SrcAlpha: 6,
  OneMinusSrcAlpha: 7,
  DstAlpha: 8,
  OneMinusDstAlpha: 9,
  ConstantColor: 10,
  OneMinusConstantColor: 11,
  ConstantAlpha: 12,
  OneMinusConstantAlpha: 13,
  SrcAlphaSaturate: 14,
};

/**
 * @enum {number} Alpha blending equation
 */
const AlphaBlendEquation = {
  FuncAdd: 0,
  FuncSubtract: 1,
  FuncReverseSubtract: 2,
  Min: 3,
  Max: 4,
};

class CompositionMaterial extends PerVertexColorMaterial {
  /**
   * Enable depth mask
   * @type {boolean}
   */
  enableDepthMask;

  /**
   * Enable alpha blending
   * @type {boolean}
   */
  enableAlphaBlending;

  /**
   * Alpha blending source factor
   * @type {number}
   */
  blendSFactor;

  /**
   * Alpha blending destination factor
   * @type {number}
   */
  blendDFactor;

  /**
   * Alpha blending color
   * @type {vec4}
   */
  blendColor = vec4.create();

  /**
   * Alpha blending source factor
   * @type {number}
   */
  blendEquation;

  constructor(
    colors,
    size = 4,
    enableDepthMask = false,
    enableAlphaBlending = true,
    blendSFactor = AlphaBlendFactor.One,
    blendDFactor = AlphaBlendFactor.Zero,
    blendColor,
    blendEquation = AlphaBlendEquation.FuncAdd
  ) {
    super(colors, size);
    this.enableDepthMask = enableDepthMask;
    this.enableAlphaBlending = enableAlphaBlending;
    this.blendSFactor = blendSFactor;
    this.blendDFactor = blendDFactor;
    this.blendEquation = blendEquation;
    if (blendColor) vec4.copy(this.blendColor, blendColor);
  }

  /**
   *
   * @param {import("../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialAttribute>} attributes
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialUniform>} uniforms
   * @param {import("../../libs/WebGLRenderer").FrameState} frameState
   */
  prerender(entity, attributes, uniforms, { gl }) {
    /**
     *
     * @param {WebGL2RenderingContext} gl
     * @param {AlphaBlendFactor} factor
     * @returns
     */
    const glBlendFactor = (gl, factor) => {
      switch (factor) {
        case AlphaBlendFactor.One:
          return gl.ONE;
        case AlphaBlendFactor.Zero:
          return gl.ZERO;
        case AlphaBlendFactor.SrcColor:
          return gl.SRC_COLOR;
        case AlphaBlendFactor.OneMinusSrcColor:
          return gl.ONE_MINUS_SRC_COLOR;
        case AlphaBlendFactor.DstColor:
          return gl.DST_COLOR;
        case AlphaBlendFactor.OneMinusDstColor:
          return gl.ONE_MINUS_DST_COLOR;
        case AlphaBlendFactor.SrcAlpha:
          return gl.SRC_ALPHA;
        case AlphaBlendFactor.OneMinusSrcAlpha:
          return gl.ONE_MINUS_SRC_ALPHA;
        case AlphaBlendFactor.DstAlpha:
          return gl.DST_ALPHA;
        case AlphaBlendFactor.OneMinusDstAlpha:
          return gl.ONE_MINUS_DST_ALPHA;
        case AlphaBlendFactor.ConstantColor:
          return gl.CONSTANT_COLOR;
        case AlphaBlendFactor.OneMinusConstantColor:
          return gl.ONE_MINUS_CONSTANT_COLOR;
        case AlphaBlendFactor.ConstantAlpha:
          return gl.CONSTANT_ALPHA;
        case AlphaBlendFactor.OneMinusConstantAlpha:
          return gl.ONE_MINUS_CONSTANT_ALPHA;
        case AlphaBlendFactor.SrcAlphaSaturate:
          return gl.SRC_ALPHA_SATURATE;
      }
    };
    /**
     *
     * @param {WebGL2RenderingContext} gl
     * @param {AlphaBlendEquation} equation
     * @returns
     */
    const glBlendEquation = (gl, equation) => {
      switch (equation) {
        case AlphaBlendEquation.FuncAdd:
          return gl.FUNC_ADD;
        case AlphaBlendEquation.FuncSubtract:
          return gl.FUNC_SUBTRACT;
        case AlphaBlendEquation.FuncReverseSubtract:
          return gl.FUNC_REVERSE_SUBTRACT;
        case AlphaBlendEquation.Min:
          return gl.MIN;
        case AlphaBlendEquation.Max:
          return gl.MAX;
      }
    };

    gl.depthMask(this.enableDepthMask);
    if (this.enableAlphaBlending) {
      gl.enable(gl.BLEND);
      gl.blendColor(this.blendColor[0], this.blendColor[1], this.blendColor[2], this.blendColor[3]);
      gl.blendFunc(glBlendFactor(gl, this.blendSFactor), glBlendFactor(gl, this.blendDFactor));
      gl.blendEquation(glBlendEquation(gl, this.blendEquation));
    }
  }

  /**
   *
   * @param {import("../../libs/entity/RenderEntity").RenderEntity} entity
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialAttribute>} attributes
   * @param {Map<string, import("../../libs/WebGLRenderer").MaterialUniform>} uniforms
   * @param {import("../../libs/WebGLRenderer").FrameState} frameState
   */
  postrender(entity, attributes, uniforms, { gl }) {
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }
}

const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    direction: vec3.fromValues(-1, -1, -1),
  })
);

scene.root.addChild(new Axes(4));

// prettier-ignore
const material0 = new PerVertexColorMaterial(new Float32Array([
  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,
  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,
  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,
  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,
  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,
  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,
]));
// prettier-ignore
const material1 = new CompositionMaterial(new Float32Array([
  0.4,0.4,1.0,0.25,  0.4,0.4,1.0,0.25,  0.4,0.4,1.0,0.25,  0.4,0.4,1.0,0.25,
  1.0,0.4,0.4,0.25,  1.0,0.4,0.4,0.25,  1.0,0.4,0.4,0.25,  1.0,0.4,0.4,0.25,
  0.4,1.0,1.0,0.25,  0.4,1.0,1.0,0.25,  0.4,1.0,1.0,0.25,  0.4,1.0,1.0,0.25,
  1.0,1.0,1.0,0.25,  1.0,1.0,1.0,0.25,  1.0,1.0,1.0,0.25,  1.0,1.0,1.0,0.25,
  1.0,1.0,0.4,0.25,  1.0,1.0,0.4,0.25,  1.0,1.0,0.4,0.25,  1.0,1.0,0.4,0.25,
  0.4,1.0,0.4,0.25,  0.4,1.0,0.4,0.25,  0.4,1.0,0.4,0.25,  0.4,1.0,0.4,0.25,
]));
// prettier-ignore
const material2 = new CompositionMaterial(new Float32Array([
  0.4,0.4,1.0,0.5,  0.4,0.4,1.0,0.5,  0.4,0.4,1.0,0.5,  0.4,0.4,1.0,0.5,
  1.0,0.4,0.4,0.5,  1.0,0.4,0.4,0.5,  1.0,0.4,0.4,0.5,  1.0,0.4,0.4,0.5,
  0.4,1.0,1.0,0.5,  0.4,1.0,1.0,0.5,  0.4,1.0,1.0,0.5,  0.4,1.0,1.0,0.5,
  1.0,1.0,1.0,0.5,  1.0,1.0,1.0,0.5,  1.0,1.0,1.0,0.5,  1.0,1.0,1.0,0.5,
  1.0,1.0,0.4,0.5,  1.0,1.0,0.4,0.5,  1.0,1.0,0.4,0.5,  1.0,1.0,0.4,0.5,
  0.4,1.0,0.4,0.5,  0.4,1.0,0.4,0.5,  0.4,1.0,0.4,0.5,  0.4,1.0,0.4,0.5,
]));
// prettier-ignore
const material3 = new CompositionMaterial(new Float32Array([
  0.4,0.4,1.0,0.75,  0.4,0.4,1.0,0.75,  0.4,0.4,1.0,0.75,  0.4,0.4,1.0,0.75,
  1.0,0.4,0.4,0.75,  1.0,0.4,0.4,0.75,  1.0,0.4,0.4,0.75,  1.0,0.4,0.4,0.75,
  0.4,1.0,1.0,0.75,  0.4,1.0,1.0,0.75,  0.4,1.0,1.0,0.75,  0.4,1.0,1.0,0.75,
  1.0,1.0,1.0,0.75,  1.0,1.0,1.0,0.75,  1.0,1.0,1.0,0.75,  1.0,1.0,1.0,0.75,
  1.0,1.0,0.4,0.75,  1.0,1.0,0.4,0.75,  1.0,1.0,0.4,0.75,  1.0,1.0,0.4,0.75,
  0.4,1.0,0.4,0.75,  0.4,1.0,0.4,0.75,  0.4,1.0,0.4,0.75,  0.4,1.0,0.4,0.75,
]));

const cube0 = new IndexedCube();
cube0.material = material0;
scene.root.addChild(cube0);

const cube1 = new IndexedCube();
cube1.setModelMatrix(mat4.fromTranslation(mat4.create(), vec3.fromValues(0, 0, 2)));
cube1.material = material1;
scene.root.addChild(cube1);

const cube2 = new IndexedCube();
cube2.setModelMatrix(mat4.fromTranslation(mat4.create(), vec3.fromValues(2, 0, 0)));
cube2.material = material2;
scene.root.addChild(cube2);

const cube3 = new IndexedCube();
cube3.setModelMatrix(mat4.fromTranslation(mat4.create(), vec3.fromValues(2, 0, 2)));
cube3.material = material3;
scene.root.addChild(cube3);

/**
 * Setups depth mask of material1
 */
watchInput("depthMask1", (enabled) => {
  material1.enableDepthMask = enabled;
  scene.renderFrame();
});
/**
 * Setups alpha blending of material1
 */
watchInput("alphaBlending1", (enabled) => {
  material1.enableAlphaBlending = enabled;
  scene.renderFrame();
});
/**
 * Setups blending color of material1
 */
watchInput("blendColor1", (color) => {
  const [r, g, b, a] = colorToFloat(color);
  vec4.set(material1.blendColor, r, g, b, a);
  scene.renderFrame();
});
/**
 * Setups blending source factor of material1
 */
watchInput("sFactor1", (factor) => {
  material1.blendSFactor = parseInt(factor);
  scene.renderFrame();
});
/**
 * Setups blending destination factor of material1
 */
watchInput("dFactor1", (factor) => {
  material1.blendDFactor = parseInt(factor);
  scene.renderFrame();
});
/**
 * Setups blending equation factor of material1
 */
watchInput("equation1", (equation) => {
  material1.blendEquation = parseInt(equation);
  scene.renderFrame();
});

/**
 * Setups depth mask of material2
 */
watchInput("depthMask2", (enabled) => {
  material2.enableDepthMask = enabled;
  scene.renderFrame();
});
/**
 * Setups alpha blending of material2
 */
watchInput("alphaBlending2", (enabled) => {
  material2.enableAlphaBlending = enabled;
  scene.renderFrame();
});
/**
 * Setups blending color of material2
 */
watchInput("blendColor2", (color) => {
  const [r, g, b, a] = colorToFloat(color);
  vec4.set(material2.blendColor, r, g, b, a);
  scene.renderFrame();
});
/**
 * Setups blending source factor of material2
 */
watchInput("sFactor2", (factor) => {
  material2.blendSFactor = parseInt(factor);
  scene.renderFrame();
});
/**
 * Setups blending destination factor of material2
 */
watchInput("dFactor2", (factor) => {
  material2.blendDFactor = parseInt(factor);
  scene.renderFrame();
});
/**
 * Setups blending equation factor of material2
 */
watchInput("equation2", (equation) => {
  material2.blendEquation = parseInt(equation);
  scene.renderFrame();
});

/**
 * Setups depth mask of material3
 */
watchInput("depthMask3", (enabled) => {
  material3.enableDepthMask = enabled;
  scene.renderFrame();
});
/**
 * Setups alpha blending of material3
 */
watchInput("alphaBlending3", (enabled) => {
  material3.enableAlphaBlending = enabled;
  scene.renderFrame();
});
/**
 * Setups blending color of material3
 */
watchInput("blendColor3", (color) => {
  const [r, g, b, a] = colorToFloat(color);
  vec4.set(material3.blendColor, r, g, b, a);
  scene.renderFrame();
});
/**
 * Setups blending source factor of material3
 */
watchInput("sFactor3", (factor) => {
  material3.blendSFactor = parseInt(factor);
  scene.renderFrame();
});
/**
 * Setups blending destination factor of material3
 */
watchInput("dFactor3", (factor) => {
  material3.blendDFactor = parseInt(factor);
  scene.renderFrame();
});
/**
 * Setups blending equation factor of material3
 */
watchInput("equation3", (equation) => {
  material3.blendEquation = parseInt(equation);
  scene.renderFrame();
});
