import { glMatrix } from "gl-matrix";
import { PerspectiveCamera } from "./camera/Perspective.js";
import { BaseEntity } from "./entity/BaseEntity.js";
import { WebGLRenderer } from "./WebGLRenderer.js";

export class FrameEvent extends Event {
  /**
   * @type {import("./WebGLRenderer.js").FrameState}
   */
  frameState;

  /**
   *
   * @param {string} type
   * @param {import("./WebGLRenderer.js").FrameState} frameState
   */
  constructor(type, frameState) {
    super(type);
    this.frameState = frameState;
  }
}

/**
 * @typedef {Object} Options
 * @property {import("./camera/Camera.js").Camera} [camera] Main camera, default {@link PerspectiveCamera}
 * @property {boolean} [enableDepthTest] Enable depth test, default `true`
 * @property {import("./WebGLRenderer.js").CullFace} [cullFace] Enable cull face
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
   * @type {import("./camera/Camera.js").Camera}
   * @readonly
   */
  mainCamera;

  /**
   * WebGL rendering context
   * @type {WebGL2RenderingContext}
   * @readonly
   */
  gl;

  /**
   * Renderer
   * @type {WebGLRenderer}
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
   * @type {BaseEntity}
   * @readonly
   */
  root = new BaseEntity();

  event = new EventTarget();

  /**
   * Constructs a new scene
   * @param {HTMLCanvasElement | string} target Scene target
   * @param {Options} [opts] Scene options
   */
  constructor(target, opts = {}) {
    this.canvas = target instanceof HTMLCanvasElement ? target : document.getElementById(target);

    this.gl = this.canvas.getContext("webgl2", opts.contextAttributes);
    this.renderer = new WebGLRenderer(this.gl, opts);

    this.mainCamera =
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
      this.mainCamera.setAspect(this.gl.canvas.width / this.gl.canvas.height, true);
      this.renderFrame();
    });
    this.resizeObserver.observe(this.canvas);
  }

  /**
   * Render current frame
   * @private
   */
  render(time = this._lastRenderTime) {
    const frameState = {
      time,
      previousTime: this._lastRenderTime,
      scene: this,
    };

    this.event.dispatchEvent(new FrameEvent("prerender", frameState));
    this.renderer.render(frameState);
    this.event.dispatchEvent(new FrameEvent("postrender", frameState));

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
