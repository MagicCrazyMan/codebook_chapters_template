import { glMatrix, mat4, vec3 } from "gl-matrix";
import { Control } from "./Control.js";

/**
 * @typedef {Object} Options Keyboard camera options
 * @property {number} [rotation] Rotation offset. in radians. Default 3 degrees
 * @property {number} [keyboardMovement] Movement offset each keyboard event. Default 0.2
 * @property {number} [wheelMovement] Movement offset each mouse wheel event. Default is `5 * movement`.
 * @property {number} [mouseMovement] Movement offset per pixel when mouse move. Default 0.02 per pixel.
 * @property {number} [touchMovement] Movement offset per pixel when touch move. Default 0.02 per pixel.
 * @property {number} [radius] Initial camera radius. Available only when `direction` is true. Default 5.
 * @property {number} [forwardLimitZoneRadius] Limit sphere zone limitation radius. Default 0.25.
 * @property {import("gl-matrix").ReadonlyVec3} [lookAt] Camera look at position. Default `(0, 0, 0)`.
 * @property {import("gl-matrix").ReadonlyVec3} [position] Camera position. Default `(0, 0, 5)`.
 * @property {import("gl-matrix").ReadonlyVec3} [up] Camera up vector. Default `(0, 1, 0)`.
 * @property {import("gl-matrix").ReadonlyVec3} [direction] Initial camera direction. Ignore `lookAt` and `position` properties if set.
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
   * Movement offset in pixel when mouse move.
   * @type {number}
   * @readonly
   */
  mouseMovement;

  /**
   * Movement offset in pixel when touch move.
   * @type {number}
   * @readonly
   */
  touchMovement;

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
    this.rotation = opts.rotation ?? glMatrix.toRadian(3);
    this.keyboardMovement = opts.keyboardMovement ?? 0.2;
    this.wheelMovement = opts.wheelMovement ?? this.keyboardMovement * 5;
    this.mouseMovement = opts.mouseMovement ?? 0.02;
    this.touchMovement = opts.touchMovement ?? 0.02;
    this.forwardLimitZoneRadius = opts.forwardLimitZoneRadius ?? 0.25;

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
    // transform position and look at position back to origin based (translate look at position to (0,0,0) and do the same translate to position)
    // and then rotate around Y axis
    // and then translate position and look at position back
    mat4.identity(this._tmpMat4);
    mat4.translate(this._tmpMat4, this._tmpMat4, this._lookAt);
    mat4.rotateY(this._tmpMat4, this._tmpMat4, rotate);
    mat4.translate(this._tmpMat4, this._tmpMat4, vec3.scale(this._tmpVec3_0, this._lookAt, -1));

    vec3.transformMat4(this._position, this._position, this._tmpMat4);

    // after horizontal rotating, directions are all changed.
    // calculate forward using position and look at position
    // calculate up using normal matrix from transformation above
    // calculate right using forward and up
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
    if (distance <= this.forwardLimitZoneRadius) return;

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
      this.left(offsetX * this.mouseMovement);
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
  _touchHoldingTimeout = 200;

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
   * Otherwise, two touches falls into ZOOMING mode.
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
       * If true, stop holding detecting procedure and set two touches mode to ZOOMING mode,
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
      this.left(offsetX * this.touchMovement);
      this.up(offsetY * this.touchMovement);

      this._previousTouchPosition[0] = touch.identifier;
      this._previousTouchPosition[1] = touch.clientX;
      this._previousTouchPosition[2] = touch.clientY;
    } else if (e.touches.length === 2) {
      //  touches
      if (this._touchHoldingIdentifier === undefined) {
        // ZOOMING mode
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;

        const calibre = Math.hypot(dx, dy);
        const calibreOffset = calibre - this._previousTowTouchesCalibre;
        if (calibreOffset > 0) {
          this.forward(4 * this.touchMovement);
        } else {
          this.backward(4 * this.touchMovement);
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

        const ratioX = offsetX / e.target.clientWidth;
        const horizontalAngle = ratioX * 2 * Math.PI;
        this.horizontalRotate(-horizontalAngle);

        const ratioY = offsetY / e.target.clientHeight;
        const verticalAngle = ratioY * 2 * Math.PI;
        this.verticalRotate(-verticalAngle);

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
      this.onTouch(e);
    };
    this._touchEndHandler = (e) => {
      this.onTouch(e);
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
