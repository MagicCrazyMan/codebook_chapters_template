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
   * Main camera
   * @type {import("./camera/Camera.js").Camera}
   * @readonly
   */
  mainCamera;

  /**
   * Controls
   * @type {Set<import("./control/Control.js").Control>}
   * @private
   */
  _controls = new Set();

  /**
   * DOM resize observer
   * @type {ResizeObserver}
   * @private
   */
  _resizeObserver;

  /**
   * WebGL rendering context
   * @type {WebGL2RenderingContext}
   * @private
   */
  _webglRenderingContext;

  /**
   * Renderer
   * @type {WebGLRenderer}
   * @private
   */
  _renderer;

  /**
   * @type {boolean}
   * @private
   */
  _requestAnimating = false;

  /**
   * Last frame render time.
   *
   * available only when request animating enabled.
   * @type {number}
   * @private
   */
  _lastRenderTime = 0;

  /**
   * @type {number}
   */
  _frameCount = 0;

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

    this._webglRenderingContext = this.canvas.getContext("webgl2", opts.contextAttributes);
    this._renderer = new WebGLRenderer(this._webglRenderingContext, opts);

    this.mainCamera = opts.camera ?? this.getDefaultCamera();

    this._resizeObserver = new ResizeObserver(() => {
      this.canvas.width = this.canvas.clientWidth;
      this.canvas.height = this.canvas.clientHeight;
      this._webglRenderingContext.viewport(
        0,
        0,
        this._webglRenderingContext.canvas.width,
        this._webglRenderingContext.canvas.height
      );
      this.mainCamera.setAspect(
        this._webglRenderingContext.canvas.width / this._webglRenderingContext.canvas.height,
        true
      );
      this.renderFrame();
    });
    this._resizeObserver.observe(this.canvas);
  }

  /**
   * @private
   */
  getDefaultCamera() {
    return new PerspectiveCamera(
      glMatrix.toRadian(60),
      this._webglRenderingContext.canvas.width / this._webglRenderingContext.canvas.height,
      0.1,
      null
    );
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
      frameCount: this._frameCount,
    };

    this.event.dispatchEvent(new FrameEvent("prerender", frameState));
    this._renderer.render(frameState);
    this.event.dispatchEvent(new FrameEvent("postrender", frameState));

    this._lastRenderTime = time;
    this._frameCount++;

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

  /**
   * Add control
   * @param {import("./control/Control.js").Control} control
   */
  addControl(control) {
    if (this._controls.has(control)) return;
    this._controls.add(control);
    control.register(this);
  }

  /**
   * Remove control
   * @param {import("./control/Control.js").Control} control
   */
  removeControl(control) {
    const exist = this._controls.delete(control);
    if (exist) {
      control.unregister(this);
    }
  }
}
