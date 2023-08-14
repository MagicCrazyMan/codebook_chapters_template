/**
 * A function marks a method as abstract.
 */
export const abstractMethod = () => {
  throw new Error("unimplemented abstract method");
};

/**
 * Converts angle in Radians to Degrees
 * @param {number} radians angle in radians
 * @returns {number} Degrees
 */
export const fromRadians = (radians) => {
  return 180 * (radians / Math.PI);
};
