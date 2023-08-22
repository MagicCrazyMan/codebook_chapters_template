import { glMatrix, mat4, vec3 } from "gl-matrix";
import { abstractMethod } from "../Utils.js";
import { Control } from "./Control.js";
/**
 * @enum {number}
 */
const TouchEventSource = {
  Start: 0,
  End: 1,
  Move: 2,
};

class TouchState {
  /**
   * @type {BlenderCamera}
   * @private
   */
  _control;

  constructor(control) {
    this._control = control;
  }

  /**
   * Executes action. if state changed, return new state.
   * @override
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  execute(event, source) {
    abstractMethod();
  }
}

class Idle extends TouchState {
  constructor(control) {
    super(control);
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  execute(event, source) {
    if (source === TouchEventSource.Start) {
      return new Panning(this._control, event);
    }
  }
}

class Panning extends TouchState {
  /**
   * @type {TouchEvent}
   * @private
   */
  _previousEvent;
  /**
   * @type {TouchEvent}
   * @private
   */
  _startEvent;

  constructor(control, event) {
    super(control);
    this._previousEvent = event;
    this._startEvent = event;
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  execute(event, source) {
    if (source === TouchEventSource.Move) {
      const period = event.timeStamp - this._startEvent.timeStamp;
      if (period <= TouchStateMachine.DOUBLE_CLICK_PERIOD) {
        const offsetX = event.changedTouches[0].clientX - this._startEvent.touches[0].clientX;
        const offsetY = event.changedTouches[0].clientY - this._startEvent.touches[0].clientY;
        const radius = Math.hypot(offsetX, offsetY);
        if (radius <= TouchStateMachine.PANNING_MIN_RADIUS) {
          return;
        }
      }

      const offsetX = event.touches[0].clientX - this._previousEvent.touches[0].clientX;
      const offsetY = event.touches[0].clientY - this._previousEvent.touches[0].clientY;
      this._control.left(offsetX * this._control.touchPanning);
      this._control.up(offsetY * this._control.touchPanning);

      this._previousEvent = event;
    } else if (source === TouchEventSource.End) {
      const period = event.timeStamp - this._startEvent.timeStamp;
      if (period <= TouchStateMachine.DOUBLE_CLICK_PERIOD) {
        const offsetX = event.changedTouches[0].clientX - this._startEvent.touches[0].clientX;
        const offsetY = event.changedTouches[0].clientY - this._startEvent.touches[0].clientY;
        const radius = Math.hypot(offsetX, offsetY);
        if (radius <= TouchStateMachine.PANNING_MIN_RADIUS) {
          return new FirstOneEnded(this._control, this._startEvent.timeStamp);
        }
      }

      return new Idle(this._control);
    } else {
      const period = event.timeStamp - this._previousEvent.timeStamp;
      if (period <= TouchStateMachine.HOLDING_PERIOD) {
        return new Forwarding(this._control, event);
      } else {
        return new Rotating(this._control, event);
      }
    }
  }
}

class FirstOneEnded extends TouchState {
  /**
   * @type {number}
   * @private
   */
  _firstStartTimestamp;

  constructor(control, firstStartTimestamp) {
    super(control);
    this._firstStartTimestamp = firstStartTimestamp;
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  execute(event, source) {
    if (source === TouchEventSource.Start) {
      const period = event.timeStamp - this._firstStartTimestamp;
      if (period <= TouchStateMachine.DOUBLE_CLICK_PERIOD) {
        return new SecondOneStarted(this._control, this._firstStartTimestamp, event);
      } else {
        return new Panning(this._control, event);
      }
    }
  }
}

class SecondOneStarted extends TouchState {
  /**
   * @type {TouchEvent}
   * @private
   */
  _previousEvent;

  /**
   * @type {number}
   * @private
   */
  _firstStartTimestamp;

  constructor(control, firstStartTimestamp, event) {
    super(control);
    this._firstStartTimestamp = firstStartTimestamp;
    this._previousEvent = event;
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  execute(event, source) {
    if (source === TouchEventSource.End) {
      const period = event.timeStamp - this._firstStartTimestamp;
      if (period <= TouchStateMachine.DOUBLE_CLICK_PERIOD) {
        this._control.forward(30 * this._control.touchForwarding);
      }

      return new Idle(this._control);
    } else if (source === TouchEventSource.Move) {
      const offsetX = event.touches[0].clientX - this._previousEvent.touches[0].clientX;
      const offsetY = event.touches[0].clientY - this._previousEvent.touches[0].clientY;
      const radius = Math.hypot(offsetX, offsetY);
      if (radius > TouchStateMachine.PANNING_MIN_RADIUS) {
        this._control.left(offsetX * this._control.touchPanning);
        this._control.up(offsetY * this._control.touchPanning);
        return new Panning(this._control, event);
      }

      this._previousEvent = event;
    } else {
      const period = event.timeStamp - this._previousEvent.timeStamp;
      if (period <= TouchStateMachine.HOLDING_PERIOD) {
        return new Forwarding(this._control, event);
      } else {
        return new Rotating(this._control, event);
      }
    }
  }
}

class Forwarding extends TouchState {
  /**
   * @type {number}
   * @private
   */
  _previousCalibre;

  constructor(control, event) {
    super(control);

    const dx = event.touches[1].clientX - event.touches[0].clientX;
    const dy = event.touches[1].clientY - event.touches[0].clientY;
    this._previousCalibre = Math.hypot(dx, dy);
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  execute(event, source) {
    if (source === TouchEventSource.Move) {
      const dx = event.touches[1].clientX - event.touches[0].clientX;
      const dy = event.touches[1].clientY - event.touches[0].clientY;
      const calibre = Math.hypot(dx, dy);
      const calibreOffset = calibre - this._previousCalibre;
      if (calibreOffset > 0) {
        this._control.forward(calibreOffset * this._control.touchForwarding);
      } else {
        this._control.backward(-calibreOffset * this._control.touchForwarding);
      }
      this._previousCalibre = calibre;
    } else if (source === TouchEventSource.End) {
      return new Panning(this._control, event);
    }
  }
}

class Rotating extends TouchState {
  /**
   * @type {TouchEvent}
   * @private
   */
  _previousEvent;

  constructor(control, event) {
    super(control);
    this._previousEvent = event;
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   * @return {TouchState | undefined}
   */
  execute(event, source) {
    if (source === TouchEventSource.Move) {
      const pdx = this._previousEvent.touches[1].clientX - this._previousEvent.touches[0].clientX;
      const pdy = this._previousEvent.touches[1].clientY - this._previousEvent.touches[0].clientY;
      const cdx = event.touches[1].clientX - event.touches[0].clientX;
      const cdy = event.touches[1].clientY - event.touches[0].clientY;

      const offsetX = cdx - pdx;
      const offsetY = cdy - pdy;

      if (this._control.touchRotating === undefined) {
        const ratioX = offsetX / event.target.clientWidth;
        const horizontalAngle = ratioX * 2 * Math.PI;
        this._control.horizontalRotate(-horizontalAngle);

        const ratioY = offsetY / event.target.clientHeight;
        const verticalAngle = ratioY * 2 * Math.PI;
        this._control.verticalRotate(-verticalAngle);
      } else {
        this._control.horizontalRotate(-offsetX * this.touchRotating);
        this._control.verticalRotate(-offsetY * this.touchRotating);
      }

      this._previousEvent = event;
    } else if (source === TouchEventSource.End) {
      return new Panning(this._control, event);
    }
  }
}

/**
 * A Finite-State Machine controls the camera position and orientation while screen touching.
 *
 * See `BlenderCameraTouch.drawio` file in the same directory for more details.
 */
class TouchStateMachine {
  static DOUBLE_CLICK_PERIOD = 250;
  static HOLDING_PERIOD = 150;
  static PANNING_MIN_RADIUS = 5;

  /**
   * @type {TouchState}
   * @readonly
   */
  state;

  constructor(control) {
    this.state = new Idle(control);
  }

  /**
   * @param {TouchEvent} event
   * @param {TouchEventSource} source
   */
  updateState(event, source) {
    event.preventDefault();
    const nextState = this.state.execute(event, source);
    if (nextState) this.state = nextState;
  }
}

/**
 * @typedef {Object} Options Keyboard camera options
 * @property {number} [keyboardForwarding] Forwarding each keyboard event. Default 0.2
 * @property {number} [keyboardPanning] Panning each keyboard event. Default 0.2
 * @property {number} [keyboardRotating] Rotating each keyboard event, in radians. Default 3 degrees
 * @property {number} [mouseForwarding] Forwarding each mouse wheel event. Default is 1.
 * @property {number} [mousePanning] Panning per pixel when mouse move. Default 0.02 per pixel.
 * @property {number} [mouseRotating] Rotating per pixel when mouse move.
 * Default rotate 360 degrees in horizontal when move from leftmost to rightmost and rotate 360 degrees from topmost to bottommost of canvas.
 * @property {number} [touchForwarding] Forwarding per pixel when touch move. Default 1.
 * @property {number} [touchPanning] Panning per pixel when touch move. Default 0.02 per pixel.
 * @property {number} [touchRotating] Rotating per pixel when touch move.
 * Default rotate 360 degrees in horizontal when move from leftmost to rightmost and rotate 360 degrees from topmost to bottommost of canvas.
 * @property {number} [forwardLimitRadius] Limit sphere zone limitation radius. Default 0.25.
 * @property {import("gl-matrix").ReadonlyVec3} [lookAt] Camera look at position. Default `(0, 0, 0)`.
 * @property {import("gl-matrix").ReadonlyVec3} [position] Camera position. Default `(0, 0, 5)`.
 * @property {import("gl-matrix").ReadonlyVec3} [up] Camera up vector. Default `(0, 1, 0)`.
 * @property {import("gl-matrix").ReadonlyVec3} [direction] Initial camera direction. Ignore `lookAt` and `position` properties if set.
 * @property {number} [radius] Initial camera radius. Available only when `direction` is true. Default 5.
 */

/**
 * A controller controls camera similar to Blender when controlling with mouse.
 */
export class BlenderCamera extends Control {
  /**
   * Forwarding each keyboard event
   * @type {number}
   * @readonly
   */
  keyboardForwarding;
  /**
   * Panning each keyboard event
   * @type {number}
   * @readonly
   */
  keyboardPanning;
  /**
   * Rotating each keyboard event, in radians
   * @type {number}
   * @readonly
   */
  keyboardRotating;
  /**
   * Forwarding each mouse wheel event
   * @type {number}
   * @readonly
   */
  mouseForwarding;
  /**
   * Panning per pixel when mouse move
   * @type {number}
   * @readonly
   */
  mousePanning;
  /**
   * Rotating per pixel when mouse move
   * @type {number | undefined}
   * @readonly
   */
  mouseRotating;
  /**
   * Forwarding per pixel when touch move
   * @type {number}
   * @readonly
   */
  touchForwarding;
  /**
   * Panning per pixel when touch move
   * @type {number}
   * @readonly
   */
  touchPanning;
  /**
   * Rotating per pixel when touch move
   * @type {number | undefined}
   * @readonly
   */
  touchRotating;
  /**
   * Limit sphere zone limitation radius
   * @type {number}
   * @readonly
   */
  forwardLimitZoneRadius;

  /**
   * Sphere radius when rotate.
   * @type {number}
   * @readonly
   */
  _radius;

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
   * @type {TouchStateMachine}
   * @private
   */
  _touchStateMachine;

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
   * @private
   */
  _touchStartHandler;

  /**
   * @private
   */
  _touchMoveHandler;

  /**
   * @private
   */
  _touchEndHandler;

  /**
   * Constructs a new camera keyboard controller
   * @param {Options} [opts] Keyboard camera options
   */
  constructor(opts = {}) {
    super();
    this.keyboardForwarding = opts.keyboardForwarding ?? 0.2;
    this.keyboardPanning = opts.keyboardPanning ?? 0.2;
    this.keyboardRotating = opts.keyboardRotating ?? glMatrix.toRadian(3);
    this.mouseForwarding = opts.mouseForwarding ?? 0.02;
    this.mousePanning = opts.mousePanning ?? 0.02;
    this.mouseRotating = opts.mouseRotating;
    this.touchForwarding = opts.touchForwarding ?? 0.02;
    this.touchPanning = opts.touchPanning ?? 0.02;
    this.touchRotating = opts.touchRotating;
    this.forwardLimitZoneRadius = opts.forwardLimitRadius ?? 0.25;
    this._touchStateMachine = new TouchStateMachine(this);

    const upVector = opts.up ?? vec3.set(this._tmpVec3_2, 0, 1, 0);
    if (opts.direction) {
      this._radius = Math.max(opts.radius ?? 5, this.forwardLimitZoneRadius);
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
      const position = opts.position ?? vec3.fromValues(0, 0, opts.radius ?? 5);
      const lookAt = opts.lookAt ?? vec3.zero(this._tmpVec3_1);

      this._radius = Math.max(vec3.dist(position, lookAt), this.forwardLimitZoneRadius);
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
    /**
     * transform position and look at position back to origin based (translate look at position to (0,0,0) and do the same translate to position)
     * and then rotate around Y axis
     * and then translate position and look at position back
     */
    mat4.identity(this._tmpMat4);
    mat4.translate(this._tmpMat4, this._tmpMat4, this._lookAt);
    mat4.rotateY(this._tmpMat4, this._tmpMat4, rotate);
    mat4.translate(this._tmpMat4, this._tmpMat4, vec3.scale(this._tmpVec3_0, this._lookAt, -1));

    vec3.transformMat4(this._position, this._position, this._tmpMat4);

    /**
     * after horizontal rotating, directions are all changed.
     * calculate forward using position and look at position
     * calculate up using normal matrix from transformation above
     * calculate right using forward and up
     */
    mat4.invert(this._tmpMat4, this._tmpMat4);
    mat4.transpose(this._tmpMat4, this._tmpMat4);
    vec3.transformMat4(this._up, this._up, this._tmpMat4);
    vec3.normalize(this._up, this._up);

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
  pan(along, movement) {
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
   * Moves left.
   * @param {number} movement Movement
   */
  left(movement) {
    this.pan("horizontal", -movement);
  }

  /**
   * Moves right.
   * @param {number} movement Movement
   */
  right(movement) {
    this.pan("horizontal", movement);
  }

  /**
   * Moves up.
   * @param {number} movement Movement
   */
  up(movement) {
    this.pan("vertical", movement);
  }

  /**
   * Moves down.
   * @param {number} movement Movement
   */
  down(movement) {
    this.pan("vertical", -movement);
  }

  /**
   * Moves camera forward.
   *
   * There is a spherical limit zone for forward moving, when forwarding,
   * camera is not able to go inside or go across the limit zone.
   *
   * Operations change only camera position and rotation radius, keeping direction and look at position.
   * @param {number} movement Movement
   */
  forward(movement) {
    const distance = vec3.dist(this._position, this._lookAt);
    if (distance <= this.forwardLimitZoneRadius) return;

    movement = Math.log(movement * distance + 1);
    const distanceIntoLimitZone = distance - this.forwardLimitZoneRadius;
    if (movement > distance - this.forwardLimitZoneRadius) {
      movement = distanceIntoLimitZone;
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
   * @param {number} movement Movement
   */
  backward(movement) {
    const distance = vec3.dist(this._position, this._lookAt);

    vec3.scale(this._tmpVec3_0, this._forward, -Math.log(movement * distance + 1));
    // move camera position
    vec3.add(this._position, this._position, this._tmpVec3_0);
    // change radius
    this._radius = vec3.dist(this._position, this._lookAt);
    this.updateCamera();
  }

  /**
   * @private
   * @param {KeyboardEvent} e
   */
  onKeyboard(e) {
    if (!this._scene) return;

    switch (e.key) {
      case "ArrowLeft":
        this.horizontalRotate(this.keyboardRotating);
        break;
      case "ArrowRight":
        this.horizontalRotate(-this.keyboardRotating);
        break;
      case "ArrowUp":
        this.up(this.keyboardForwarding);
        break;
      case "ArrowDown":
        this.down(this.keyboardForwarding);
        break;
      case "w":
        this.forward(this.keyboardPanning);
        break;
      case "a":
        this.left(this.keyboardPanning);
        break;
      case "s":
        this.backward(this.keyboardPanning);
        break;
      case "d":
        this.right(this.keyboardPanning);
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
      this.forward(-e.deltaY * this.mouseForwarding);
    } else {
      this.backward(e.deltaY * this.mouseForwarding);
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
      this.left(offsetX * this.mousePanning);
      this.up(offsetY * this.mousePanning);
    } else {
      if (this.mouseRotating === undefined) {
        const ratioX = offsetX / e.target.clientWidth;
        const horizontalAngle = ratioX * 2 * Math.PI;
        this.horizontalRotate(-horizontalAngle);

        const ratioY = offsetY / e.target.clientHeight;
        const verticalAngle = ratioY * 2 * Math.PI;
        this.verticalRotate(-verticalAngle);
      } else {
        this.horizontalRotate(-offsetX * this.mouseRotating);
        this.verticalRotate(-offsetY * this.mouseRotating);
      }
    }

    this._previousMousePosition[0] = e.x;
    this._previousMousePosition[1] = e.y;
  }

  /**
   * @private
   * @param {TouchEvent} event
   */
  onTouchStart(event) {
    this._touchStateMachine.updateState(event, TouchEventSource.Start);
  }

  /**
   * @private
   * @param {TouchEvent} event
   */
  onTouchEnd(event) {
    this._touchStateMachine.updateState(event, TouchEventSource.End);
  }

  /**
   * @private
   * @param {TouchEvent} event
   */
  onTouchMove(event) {
    this._touchStateMachine.updateState(event, TouchEventSource.Move);
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
    this._touchStartHandler = (e) => {
      this.onTouchStart(e);
    };
    this._touchEndHandler = (e) => {
      this.onTouchEnd(e);
    };
    this._touchMoveHandler = (e) => {
      this.onTouchMove(e);
    };
    window.addEventListener("keydown", this._keyboardHandler);
    scene.canvas.addEventListener("wheel", this._wheelHandler, { passive: false });
    scene.canvas.addEventListener("mousedown", this._mouseDownHandler);
    scene.canvas.addEventListener("mouseup", this._mouseUpHandler);
    scene.canvas.addEventListener("mousemove", this._mouseMoveHandler);
    scene.canvas.addEventListener("touchstart", this._touchStartHandler);
    scene.canvas.addEventListener("touchend", this._touchEndHandler);
    scene.canvas.addEventListener("touchmove", this._touchMoveHandler);
  }

  /**
   * Unregister control from scene
   */
  unregister() {
    if (this._keyboardHandler) window.removeEventListener("keydown", this._keyboardHandler);
    if (this._wheelHandler)
      this.scene?.canvas.removeEventListener("wheel", this._wheelHandler, { passive: false });
    if (this._mouseDownHandler)
      this.scene?.canvas.removeEventListener("mousedown", this._mouseDownHandler);
    if (this._mouseUpHandler)
      this.scene?.canvas.removeEventListener("mouseup", this._mouseUpHandler);
    if (this._mouseMoveHandler)
      this.scene?.canvas.removeEventListener("mousemove", this._mouseMoveHandler);
    if (this._touchStartHandler)
      this.scene?.canvas.removeEventListener("touchstart", this._touchStartHandler);
    if (this._touchEndHandler)
      this.scene?.canvas.removeEventListener("touchend", this._touchEndHandler);
    if (this._touchMoveHandler)
      this.scene?.canvas.removeEventListener("touchmove", this._touchMoveHandler);

    this.scene = undefined;
  }
}
