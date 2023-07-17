import { PerspectiveCamera } from "./camera/perspective";

export class Scene {
  /**
   * @type {WebGL2RenderingContext}
   * @readonly
   */
  gl;
  /**
   * @type {PerspectiveCamera}
   * @readonly
   */
  camera;
  /**
   * @type {number}
   */
  lastRenderTime = 0;

  /**
   * Constructs a new scene
   * @param {WebGL2RenderingContext} gl
   * @param {PerspectiveCamera} camera
   */
  constructor(gl, camera) {
    this.gl = gl;
    this.camera = camera;
  }

  /**
   * Renders frame.
   * @public
   */
  render() {
    //
  }
}
