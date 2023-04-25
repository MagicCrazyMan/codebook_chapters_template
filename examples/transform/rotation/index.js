import {
  bindWebGLProgram,
  bindWebGLBuffer,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../libs/common";

const gl = getWebGLContext();

const vertexShader = `
  attribute vec4 a_Position;
  uniform vec3 u_RotationAngles;

  void main() {
    float alpha = radians(u_RotationAngles.x);
    float beta = radians(u_RotationAngles.y);
    float gamma = radians(u_RotationAngles.z);
    mat4 rotationMatrix = mat4(
      cos(alpha) * cos(beta)                                       , sin(alpha) * cos(beta)                                       , -sin(beta)            , 0,
      cos(alpha) * sin(beta) * sin(gamma) - sin(alpha) * cos(gamma), sin(alpha) * sin(beta) * sin(gamma) + cos(alpha) * cos(gamma), cos(beta) * sin(gamma), 0,
      cos(alpha) * sin(beta) * cos(gamma) + sin(alpha) * sin(gamma), sin(alpha) * sin(beta) * cos(gamma) - cos(alpha) * sin(gamma), cos(beta) * cos(gamma), 0,
      0                                                            , 0                                                            , 0                     , 1
    );
    mat4 translation = mat4(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0.5, 0, 0, 1
    );
    gl_Position = rotationMatrix * translation * a_Position;
  }
`;
const fragmentShader = `
  void main() {
    gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
  }
`;

const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups buffer
 */
const [aPosition] = bindWebGLBuffer(gl, program, ["a_Position"]);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
const arraybuffer = new Float32Array([0, 1, 0, 0, 1, 0]);
gl.bufferData(gl.ARRAY_BUFFER, arraybuffer, gl.STATIC_DRAW);

/**
 * Setups rotation inputs
 */
const uRotationAngles = gl.getUniformLocation(program, "u_RotationAngles");
const setRotationAngles = (yaw, pitch, roll) => {
  gl.uniform3f(uRotationAngles, yaw, pitch, roll);
};
const inputs = [
  document.getElementById("yaw"),
  document.getElementById("pitch"),
  document.getElementById("roll"),
];
inputs.forEach((input) => {
  input.addEventListener("input", () => {
    setRotationAngles(inputs[0].value, inputs[1].value, inputs[2].value);
    render();
  });
});
setRotationAngles(inputs[0].value, inputs[1].value, inputs[2].value);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, arraybuffer.length / 2);
};

getCanvasResizeObserver(render);
render();
