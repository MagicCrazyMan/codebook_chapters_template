import { glMatrix, mat4, vec3 } from "gl-matrix";
import { Control } from "./Control.js";

/**
 * @typedef {Object} Options Keyboard camera options
 * @property {number} [rotation] Rotation offset. in radians. default 3 degrees
 * @property {number} [movement] Movement offset each keyboard event. default 0.2 units
 * @property {number} [wheelMovement] Movement offset each mouse wheel event. default equals `5 * movement`.
 * @property {number} [mouseMovement] Movement offset in pixel. default equals 0.02 units per pixel.
 * @property {import("gl-matrix").ReadonlyVec3} [lookAt] Camera look at position
 * @property {import("gl-matrix").ReadonlyVec3} [position] Camera position
 * @property {import("gl-matrix").ReadonlyVec3} [up] Camera up vector
 * @property {import("gl-matrix").ReadonlyVec3} [direction] Initialize camera direction. if set, `lookAt` and `position` properties ignored.
 */

/**
 * A controller controls camera similar to Blender when controlling with mouse.
 */
export class BlenderCamera extends Control {
  /**
   * Rotation each keyboard event, in radians
   * @type {number}
   * @readonly
   */
  rotation;

  /**
   * Sphere radius when rotate.
   * @type {number}
   * @readonly
   */
  _radius;

  /**
   * Movement each keyboard event
   * @type {number}
   * @readonly
   */
  keyboardMovement;

  /**
   * Movement each mouse wheel event
   * @type {number}
   * @readonly
   */
  wheelMovement;

  /**
   * Movement offset in pixel.
   * @type {number}
   * @readonly
   */
  mouseMovement;

  /**
   * @type {import("../Scene.js").Scene | undefined}
   * @private
   */
  _scene;

  /**
   * @private
   */
  _position = vec3.create();

  /**
   * @private
   */
  _lookAt = vec3.create();

  /**
   * @private
   */
  _forward = vec3.create();

  /**
   * @private
   */
  _up = vec3.create();

  /**
   * @private
   */
  _right = vec3.create();

  /**
   * @private
   */
  _tmpMat4 = mat4.create();

  /**
   * @private
   */
  _tmpVec3_0 = vec3.create();

  /**
   * @private
   */
  _tmpVec3_1 = vec3.create();

  /**
   * @private
   */
  _tmpVec3_2 = vec3.create();

  /**
   * @private
   */
  _keyboardHandler;

  /**
   * @private
   */
  _wheelHandler;

  /**
   * @private
   */
  _mouseDownHandler;

  /**
   * @private
   */
  _mouseUpHandler;

  /**
   * @private
   */
  _mouseMoveHandler;

  /**
   * Constructs a new camera keyboard controller
   * @param {Options} [opts] Keyboard camera options
   */
  constructor(opts = {}) {
    super();
    this.rotation = opts.rotation ?? glMatrix.toRadian(3);
    this.keyboardMovement = opts.movement ?? 0.2;
    this.wheelMovement = opts.wheelMovement ?? this.keyboardMovement * 5;
    this.mouseMovement = opts.mouseMovement ?? 0.02;

    const upVector = opts.up ?? vec3.set(this._tmpVec3_2, 0, 1, 0);
    if (opts.direction) {
      this._radius = 5;
      vec3.zero(this._lookAt);

      // calculates directions
      vec3.copy(this._up, upVector);
      vec3.normalize(this._up, this._up);
      vec3.copy(this._forward, opts.direction);
      vec3.normalize(this._forward, this._forward);
      vec3.cross(this._right, this._forward, this._up);
      vec3.normalize(this._right, this._right);
      vec3.cross(this._up, this._right, this._forward);
      vec3.normalize(this._up, this._up);
    } else {
      const position = opts.position ?? vec3.set(this._tmpVec3_0, 0, 0, this._radius);
      const lookAt = opts.lookAt ?? vec3.zero(this._tmpVec3_1);

      this._radius = Math.max(vec3.dist(position, lookAt), this._forwardLimitZoneRadius);
      vec3.copy(this._lookAt, lookAt);

      // calculates directions
      vec3.copy(this._up, upVector);
      vec3.normalize(this._up, this._up);
      vec3.sub(this._forward, lookAt, position);
      vec3.normalize(this._forward, this._forward);
      vec3.cross(this._right, this._forward, this._up);
      vec3.normalize(this._right, this._right);
      vec3.cross(this._up, this._right, this._forward);
      vec3.normalize(this._up, this._up);
    }

    vec3.add(
      this._position,
      this._lookAt,
      vec3.scale(this._tmpVec3_0, this._forward, -this._radius)
    );

    // // prettier-ignore
    // const localToWorld = new Float32Array([
    //   ...this._right,   0,
    //   ...this._up,      0,
    //   ...this._forward, 0,
    //   ...position, 1
    // ]);
    // console.log(localToWorld);
    // console.log(mat4.targetTo(mat4.create(), position, lookAt, upVector));
    // console.log(mat4.lookAt(mat4.create(), position, lookAt, upVector));
    // const worldToLocal = mat4.invert(mat4.create(), localToWorld);
    // console.log(vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, 0), localToWorld));
    // console.log(vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, 0), worldToLocal));
    // console.log(
    //   vec3.transformMat4(vec3.create(), vec3.fromValues(0, 0, 4.242640972137451), localToWorld)
    // );
  }

  /**
   * @private
   */
  updateCamera() {
    this._scene?.mainCamera.setUpVector(this._up, false);
    this._scene?.mainCamera.setPosition(this._position, false);
    this._scene?.mainCamera.setLookAt(this._lookAt, true);
    this._scene?.renderFrame();
  }

  /**
   * Horizontally rotate around current camera up direction
   *
   * Rotation operations change camera position and direction, keeping look at position.
   * @public
   * @param {number} rotate Rotate angle, in radians
   */
  horizontalRotate(rotate) {
    mat4.identity(this._tmpMat4);
    mat4.translate(this._tmpMat4, this._tmpMat4, this._lookAt);
    mat4.rotate(this._tmpMat4, this._tmpMat4, rotate, this._up);
    mat4.translate(this._tmpMat4, this._tmpMat4, vec3.scale(this._tmpVec3_0, this._lookAt, -1));

    vec3.transformMat4(this._position, this._position, this._tmpMat4);

    // when horizontal rotate, up direction not changed, update forward and right directions
    vec3.sub(this._forward, this._lookAt, this._position);
    vec3.normalize(this._forward, this._forward);
    vec3.cross(this._right, this._forward, this._up);
    vec3.normalize(this._right, this._right);

    this.updateCamera();
  }

  /**
   * Vertically rotate around current camera right direction
   *
   * Operations change camera position and direction, keeping look at position.
   * @public
   * @param {number} rotate Rotate angle, in radians
   */
  verticalRotate(rotate) {
    mat4.identity(this._tmpMat4);
    mat4.translate(this._tmpMat4, this._tmpMat4, this._lookAt);
    mat4.rotate(this._tmpMat4, this._tmpMat4, rotate, this._right);
    mat4.translate(this._tmpMat4, this._tmpMat4, vec3.scale(this._tmpVec3_0, this._lookAt, -1));

    vec3.transformMat4(this._position, this._position, this._tmpMat4);

    // when vertical rotate, right direction not changed, update forward and up directions
    vec3.sub(this._forward, this._lookAt, this._position);
    vec3.normalize(this._forward, this._forward);
    vec3.cross(this._up, this._right, this._forward);
    vec3.normalize(this._up, this._up);

    this.updateCamera();
  }

  /**
   * Moves camera horizontal of vertical.
   *
   * Operations change camera position and look at position, keeping direction.
   * @private
   * @param {"horizontal" | "vertical"} along Movement along direction
   * @param {number} movement Movement
   */
  moveHorVer(along, movement) {
    vec3.scale(this._tmpVec3_0, along === "vertical" ? this._up : this._right, movement);
    // move camera position
    vec3.add(this._position, this._position, this._tmpVec3_0);
    // change camera look at target of new position along forward direction
    vec3.add(
      this._lookAt,
      this._position,
      vec3.scale(this._tmpVec3_0, this._forward, this._radius)
    );
    this.updateCamera();
  }

  /**
   * @private
   * @type {number}
   */
  _forwardLimitZoneRadius = 0.5;

  /**
   * Moves camera forward.
   *
   * There is a spherical limit zone for forward moving, when forwarding,
   * camera is not able to go inside or go across the limit zone.
   *
   * Operations change only camera position and rotation radius, keeping direction and look at position.
   * @private
   * @param {number} movement Movement
   */
  moveForward(movement) {
    const distance = vec3.dist(this._position, this._lookAt);
    if (distance <= this._forwardLimitZoneRadius) return;

    const distanceIntoSafeZone = distance - this._forwardLimitZoneRadius;
    if (movement > distance - this._forwardLimitZoneRadius) {
      movement = distanceIntoSafeZone;
    }

    vec3.scale(this._tmpVec3_0, this._forward, movement);
    // move camera position
    vec3.add(this._position, this._position, this._tmpVec3_0);
    // change radius
    this._radius = vec3.dist(this._position, this._lookAt);
    this.updateCamera();
  }

  /**
   * Moves camera backward.
   *
   * Operations change only camera position and rotation radius, keeping direction and look at position.
   * @private
   * @param {number} movement Movement
   */
  moveBackward(movement) {
    vec3.scale(this._tmpVec3_0, this._forward, -movement);
    // move camera position
    vec3.add(this._position, this._position, this._tmpVec3_0);
    // change radius
    this._radius = vec3.dist(this._position, this._lookAt);
    this.updateCamera();
  }

  /**
   * Moves left.
   * @param {number} movement Movement
   */
  left(movement) {
    this.moveHorVer("horizontal", -movement);
  }

  /**
   * Moves right.
   * @param {number} movement Movement
   */
  right(movement) {
    this.moveHorVer("horizontal", movement);
  }

  /**
   * Moves up.
   * @param {number} movement Movement
   */
  up(movement) {
    this.moveHorVer("vertical", movement);
  }

  /**
   * Moves down.
   * @param {number} movement Movement
   */
  down(movement) {
    this.moveHorVer("vertical", -movement);
  }

  /**
   * Moves forward.
   * @param {number} movement Movement
   */
  forward(movement) {
    this.moveForward(movement);
  }

  /**
   * Moves backward.
   * @param {number} movement Movement
   */
  backward(movement) {
    this.moveBackward(movement);
  }

  /**
   * @private
   * @param {KeyboardEvent} e
   */
  onKeyboard(e) {
    if (!this._scene) return;

    switch (e.key) {
      case "ArrowLeft":
        this.horizontalRotate(this.rotation);
        break;
      case "ArrowRight":
        this.horizontalRotate(-this.rotation);
        break;
      case "ArrowUp":
        this.up(this.keyboardMovement);
        break;
      case "ArrowDown":
        this.down(this.keyboardMovement);
        break;
      case "w":
        this.forward(this.keyboardMovement);
        break;
      case "a":
        this.left(this.keyboardMovement);
        break;
      case "s":
        this.backward(this.keyboardMovement);
        break;
      case "d":
        this.right(this.keyboardMovement);
        break;
      default:
        return;
    }

    e.preventDefault();
  }

  /**
   * @private
   * @param {WheelEvent} e
   */
  onWheel(e) {
    e.preventDefault();

    if (e.deltaY < 0) {
      this.forward(this.wheelMovement);
    } else {
      this.backward(this.wheelMovement);
    }
  }

  /**
   * @private
   * @type {boolean}
   */
  _middleDown = false;

  /**
   * @private
   * @param {MouseEvent} e
   */
  onMouseDown(e) {
    if (e.button === 1) {
      e.preventDefault();
      this._middleDown = true;
      this._previousMousePosition = [e.x, e.y];
    }
  }

  /**
   * @private
   * @param {MouseEvent} e
   */
  onMouseUp(e) {
    if (e.button === 1) {
      this._middleDown = false;
      this._previousMousePosition = undefined;
    }
  }

  /**
   * @type {number[] | undefined}
   * @private
   */
  _previousMousePosition;

  /**
   * @private
   * @param {MouseEvent} e
   */
  onMouseMove(e) {
    if (!this._middleDown) return;

    e.preventDefault();
    if (!this._previousMousePosition) {
      this._previousMousePosition = [e.x, e.y];
      return;
    }

    const offsetX = e.x - this._previousMousePosition[0];
    const offsetY = e.y - this._previousMousePosition[1];

    if (e.shiftKey) {
      this.right(-offsetX * this.mouseMovement);
      this.up(offsetY * this.mouseMovement);
    } else {
      const ratioX = offsetX / e.target.clientWidth;
      const horizontalAngle = ratioX * 2 * Math.PI;
      this.horizontalRotate(-horizontalAngle);

      const ratioY = offsetY / e.target.clientHeight;
      const verticalAngle = ratioY * 2 * Math.PI;
      this.verticalRotate(-verticalAngle);
    }

    this._previousMousePosition[0] = e.x;
    this._previousMousePosition[1] = e.y;
  }

  /**
   * Register control to scene
   * @param {import("../Scene.js").Scene} scene
   */
  register(scene) {
    this._scene = scene;

    this.updateCamera();

    this._keyboardHandler = (e) => {
      this.onKeyboard(e);
    };
    this._wheelHandler = (e) => {
      this.onWheel(e);
    };
    this._mouseDownHandler = (e) => {
      this.onMouseDown(e);
    };
    this._mouseUpHandler = (e) => {
      this.onMouseUp(e);
    };
    this._mouseMoveHandler = (e) => {
      this.onMouseMove(e);
    };
    window.addEventListener("keydown", this._keyboardHandler);
    window.addEventListener("wheel", this._wheelHandler, { passive: false });
    window.addEventListener("mousedown", this._mouseDownHandler);
    window.addEventListener("mouseup", this._mouseUpHandler);
    window.addEventListener("mousemove", this._mouseMoveHandler);
  }

  /**
   * Unregister control from scene
   */
  unregister() {
    this.scene = undefined;

    if (this._keyboardHandler) window.removeEventListener("keydown", this._keyboardHandler);
    if (this._wheelHandler)
      window.removeEventListener("wheel", this._wheelHandler, { passive: false });
    if (this._mouseDownHandler) window.removeEventListener("mousedown", this._mouseDownHandler);
    if (this._mouseUpHandler) window.removeEventListener("mouseup", this._mouseUpHandler);
    if (this._mouseMoveHandler) window.removeEventListener("mousemove", this._mouseMoveHandler);
  }
}
