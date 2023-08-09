import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../../libs/common";
import { createSphereTriangulated } from "../../../libs/geom/sphere";

const vertexShader = `
  attribute vec4 a_Position;

  uniform mat4 u_MvpMatrix;

  uniform vec3 u_AmbientReflection;
  uniform vec3 u_AmbientLightColor;

  varying vec3 v_AmbientColor;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_AmbientColor = u_AmbientLightColor * u_AmbientReflection;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec3 v_AmbientColor;

  void main() {
    gl_FragColor = vec4(v_AmbientColor, 1.0);
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups mvp, normal matrix and camera position
 */
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const modelMatrix = mat4.create();
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(0, 0, 6),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
const setMvpMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(50),
    gl.canvas.width / gl.canvas.height,
    1,
    1000
  );

  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projectionMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
setMvpMatrix();

/**
 * Setups ambient light color
 */
const uAmbientLightColor = gl.getUniformLocation(program, "u_AmbientLightColor");
const ambientLightColorInputs = [
  document.getElementById("ambientColorR"),
  document.getElementById("ambientColorG"),
  document.getElementById("ambientColorB"),
];
ambientLightColorInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setAmbientLightColor();
    render();
  });
});
const setAmbientLightColor = () => {
  gl.uniform3f(
    uAmbientLightColor,
    parseFloat(ambientLightColorInputs[0].value),
    parseFloat(ambientLightColorInputs[1].value),
    parseFloat(ambientLightColorInputs[2].value)
  );
};
setAmbientLightColor();

/**
 * Setups sphere
 */
const aPosition = gl.getAttribLocation(program, "a_Position");
const { vertices } = createSphereTriangulated(2, 24, 48);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);

/**
 * Setups ambient reflections
 */
const ambientReflection = vec3.fromValues(0.4, 0.4, 1.0);
const uAmbientReflection = gl.getUniformLocation(program, "u_AmbientReflection");
gl.uniform3fv(uAmbientReflection, ambientReflection);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
};
render();

getCanvasResizeObserver(() => {
  setMvpMatrix();
  render();
});
