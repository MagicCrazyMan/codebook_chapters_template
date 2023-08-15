/* eslint-disable @typescript-eslint/no-unused-vars */
import { abstractMethod } from "../Utils.js";

export class Control {
  /**
   * Register control to scene
   * @param {import("../Scene").Scene} scene
   */
  register(scene) {
    abstractMethod();
  }

  /**
   * Unregister control from scene
   * @param {import("../Scene").Scene} scene
   */
  unregister(scene) {
    abstractMethod();
  }
}
