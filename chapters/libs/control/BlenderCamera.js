import { glMatrix, mat4, vec3 } from "gl-matrix";
import { Control } from "./Control.js";

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
   * @type {number[] | undefined}
   * @private
   */
  _previousTouchPosition;

  /**
   * @type {number[][] | undefined}
   * @private
   */
  _previousTowTouchesPositions;

  /**
   * @type {number | undefined}
   * @private
   */
  _previousTowTouchesCalibre;

  /**
   * @type {number | undefined}
   * @private
   */
  _touchHoldingTimer;

  /**
   * @type {number}
   * @private
   */
  _touchHoldingTimeout = 250;

  /**
   * @type {number}
   * @private
   */
  _touchHoldingLimitRadius = 5;

  /**
   * @type {number | undefined}
   * @private
   */
  _touchHoldingIdentifier;

  /**
   * Start touch holding detecting procedure.
   *
   * If procedure finished, two touches falls into ROTATING mode.
   * Otherwise, two touches falls into FORWARDING mode.
   * @private
   * @param {number} identifier
   */
  startTouchHoldTimer(identifier) {
    this._touchHoldingTimer = setTimeout(() => {
      this._touchHoldingIdentifier = identifier;
      this._touchHoldingTimer = undefined;
    }, this._touchHoldingTimeout);
  }

  /**
   * @private
   */
  stopTouchHoldTimer() {
    if (this._touchHoldingTimer) {
      clearTimeout(this._touchHoldingTimer);
      this._touchHoldingTimer = undefined;
    }
  }

  /**
   * @private
   * @param {TouchEvent} e
   */
  onTouch(e) {
    if (e.touches.length === 1) {
      // start touch holding detecting procedure
      this.startTouchHoldTimer(e.touches[0].identifier);

      this._previousTouchPosition = [
        e.touches[0].identifier,
        e.touches[0].clientX,
        e.touches[0].clientY,
      ];
    } else if (e.touches.length === 2) {
      this.stopTouchHoldTimer();

      this._previousTowTouchesPositions = [
        [e.touches[0].identifier, e.touches[0].clientX, e.touches[0].clientY],
        [e.touches[1].identifier, e.touches[1].clientX, e.touches[1].clientY],
      ];

      const dx = e.touches[1].clientX - e.touches[0].clientX;
      const dy = e.touches[1].clientY - e.touches[0].clientY;
      this._previousTowTouchesCalibre = Math.hypot(dx, dy);
      this._previousTowTouchesAngle = Math.atan2(dy, dx);
    } else {
      this.stopTouchHoldTimer();

      this._previousTouchPosition = undefined;
      this._previousTowTouchesPositions = undefined;
      this._previousTowTouchesCalibre = undefined;
      this._touchHoldingIdentifier = undefined;
      return;
    }

    e.preventDefault();
  }

  /**
   * SHOULD REFACTOR THIS DOUBLE CLICK USING STATE MACHINE
   */
  /**
   * @type {number}
   * @private
   */
  _doubleTouchTimeout = 250;
  /**
   * @type {number | undefined}
   * @private
   */
  _doubleTouchStartTime = undefined;
  /**
   * @type {number}
   * @private
   */
  _doubleTouchStartCount = 0;
  /**
   * @type {number}
   * @private
   */
  _doubleTouchEndCount = 0;

  /**
   * @private
   */
  clearDoubleTouch() {
    this._doubleTouchStartTime = undefined;
    this._doubleTouchStartCount = 0;
    this._doubleTouchEndCount = 0;
  }

  /**
   * @private
   * @param {TouchEvent} e
   */
  onTouchStart(e) {
    if (e.changedTouches.length === 1 && e.touches.length === 1) {
      if (this._doubleTouchStartCount === 0) this._doubleTouchStartTime = new Date().getTime();
      this._doubleTouchStartCount++;
    } else {
      this.clearDoubleTouch();
    }

    this.onTouch(e);
  }

  /**
   * @private
   * @param {TouchEvent} e
   */
  onTouchEnd(e) {
    if (e.changedTouches.length === 1 && e.touches.length === 0) {
      this._doubleTouchEndCount++;
      if (this._doubleTouchEndCount >= 2 && this._doubleTouchStartCount >= 2) {
        if (new Date().getTime() - this._doubleTouchStartTime <= this._doubleTouchTimeout) {
          this.forward(30 * this.touchForwarding);
        }

        this.clearDoubleTouch();
      }
    } else {
      this.clearDoubleTouch();
    }

    this.onTouch(e);
  }

  /**
   * @private
   * @param {TouchEvent} e
   */
  onTouchMove(e) {
    if (e.touches.length === 1) {
      // single touch
      const touch = e.touches[0];

      const offsetX = touch.clientX - this._previousTouchPosition[1];
      const offsetY = touch.clientY - this._previousTouchPosition[2];

      /**
       * If holding detecting procedure running,
       * check whether movement radius exceed the holding limit radius.
       * If true, stop holding detecting procedure and set two touches mode to FORWARDING mode,
       * and do panning.
       * If false, stop panning and continue holding detecting procedure.
       */
      if (this._touchHoldingTimer) {
        const radius = Math.hypot(offsetX, offsetY);
        if (radius > this._touchHoldingLimitRadius) {
          this.stopTouchHoldTimer();
        } else {
          return;
        }
      }

      // PANNING
      this.left(offsetX * this.touchPanning);
      this.up(offsetY * this.touchPanning);

      this._previousTouchPosition[0] = touch.identifier;
      this._previousTouchPosition[1] = touch.clientX;
      this._previousTouchPosition[2] = touch.clientY;
    } else if (e.touches.length === 2) {
      //  touches
      if (this._touchHoldingIdentifier === undefined) {
        // FORWARDING mode
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;

        const calibre = Math.hypot(dx, dy);
        const calibreOffset = calibre - this._previousTowTouchesCalibre;
        if (calibreOffset > 0) {
          this.forward(calibreOffset * this.touchForwarding);
        } else {
          this.backward(-calibreOffset * this.touchForwarding);
        }
        this._previousTowTouchesCalibre = calibre;
      } else {
        // ROTATING mode
        const previousChangedTouch =
          this._previousTowTouchesPositions[0][0] === this._touchHoldingIdentifier
            ? this._previousTowTouchesPositions[1]
            : this._previousTowTouchesPositions[0];
        const currentChangedTouch =
          e.touches[0].identifier === this._touchHoldingIdentifier ? e.touches[1] : e.touches[0];

        const offsetX = currentChangedTouch.clientX - previousChangedTouch[1];
        const offsetY = currentChangedTouch.clientY - previousChangedTouch[2];

        if (this.touchRotating === undefined) {
          const ratioX = offsetX / e.target.clientWidth;
          const horizontalAngle = ratioX * 2 * Math.PI;
          this.horizontalRotate(-horizontalAngle);

          const ratioY = offsetY / e.target.clientHeight;
          const verticalAngle = ratioY * 2 * Math.PI;
          this.verticalRotate(-verticalAngle);
        } else {
          this.horizontalRotate(-offsetX * this.touchRotating);
          this.verticalRotate(-offsetY * this.touchRotating);
        }

        this._previousTowTouchesPositions[0][0] = e.touches[0].identifier;
        this._previousTowTouchesPositions[0][1] = e.touches[0].clientX;
        this._previousTowTouchesPositions[0][2] = e.touches[0].clientY;
        this._previousTowTouchesPositions[1][0] = e.touches[1].identifier;
        this._previousTowTouchesPositions[1][1] = e.touches[1].clientX;
        this._previousTowTouchesPositions[1][2] = e.touches[1].clientY;
      }
    } else {
      return;
    }

    e.preventDefault();
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
