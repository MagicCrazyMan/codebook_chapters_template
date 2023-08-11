import { glMatrix } from "gl-matrix";
import { PerspectiveCamera } from "./camera/perspective.js";
import { TransformObject } from "./core/transform_object.js";
import { Renderer } from "./renderer.js";

/**
 * @typedef {Object} Options
 * @property {import("./camera/camera").Camera} [camera] Main camera, default {@link PerspectiveCamera}
 * @property {boolean} [enableDepthTest] Enable depth test, default `true`
 * @property {import("./renderer.js").CullFaceSide} [enableCullFace] Enable cull face
 * @property {import("gl-matrix").ReadonlyVec4} [clearColor] WebGl clear color, default `vec4 (0, 0, 0 ,0)`
 * @property {WebGLContextAttributes} [contextAttributes] WebGL context attributes
 */

export class Scene {
  /**
   * Target canvas
   * @type {HTMLCanvasElement}
   * @readonly
   */
  canvas;
  /**
   * DOM resize observer
   * @type {ResizeObserver}
   * @private
   */
  resizeObserver;

  /**
   * Main camera
   * @type {import("./camera/camera").Camera}
   * @readonly
   */
  camera;

  /**
   * WebGL rendering context
   * @type {WebGL2RenderingContext}
   * @readonly
   */
  gl;

  /**
   * Renderer
   * @type {Renderer}
   * @readonly
   */
  renderer;

  /**
   * @type {boolean}
   */
  _requestAnimating = false;

  /**
   * Last frame render time.
   *
   * available only when request animating enabled.
   * @type {number}
   */
  _lastRenderTime = 0;

  /**
   * Root object
   * @type {TransformObject}
   * @readonly
   */
  root = new TransformObject();

  /**
   * Constructs a new scene
   * @param {HTMLCanvasElement | string} target Scene target
   * @param {Options} [opts] Scene options
   */
  constructor(target, opts = {}) {
    this.canvas = target instanceof HTMLCanvasElement ? target : document.getElementById(target);

    this.gl = this.canvas.getContext("webgl2", opts.contextAttributes);
    this.renderer = new Renderer(this.gl, opts);

    this.camera =
      opts.camera ??
      new PerspectiveCamera(
        glMatrix.toRadian(60),
        this.gl.canvas.width / this.gl.canvas.height,
        1,
        null
      );

    this.resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
      this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
      this.camera.setAspect(this.gl.canvas.width / this.gl.canvas.height, true);
      this.render();
    });
    this.resizeObserver.observe(this.canvas);
  }

  /**
   * Render current frame
   * @private
   */
  render(time = this._lastRenderTime) {
    this.renderer.render({
      time,
      scene: this,
    });

    this._lastRenderTime = time;

    if (this._requestAnimating) {
      requestAnimationFrame(this.render.bind(this));
    }
  }

  /**
   * Render single frame
   * @public
   */
  renderFrame() {
    if (this._requestAnimating) return;
    this.render();
  }

  /**
   * Starts rendering
   * @public
   */
  startRendering() {
    if (this._requestAnimating) return;

    this._requestAnimating = true;
    this.render();
  }

  /**
   * Starts rendering
   * @public
   */
  stopRendering() {
    this._requestAnimating = false;
  }
}
