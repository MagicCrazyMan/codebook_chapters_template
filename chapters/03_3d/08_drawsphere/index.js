import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../libs/common";

/**
 * Create a sphere mesh
 * @param {number} radius Sphere radius
 * @param {number} verticalSegments
 * @param {number} horizontalSegments
 */
const createSphere = (radius, verticalSegments, horizontalSegments = verticalSegments) => {
  const verticalOffset = Math.PI / verticalSegments;
  const horizontalOffset = Math.PI / horizontalSegments;

  const vertices = [];
  for (let i = 0; i <= verticalSegments; i++) {
    const ri = i * verticalOffset;
    const ci = Math.cos(ri);
    const si = Math.sin(ri);

    for (let j = 0; j <= verticalSegments; j++) {
      const rj = j * 2 * horizontalOffset;
      const cj = Math.cos(rj);
      const sj = Math.sin(rj);

      const x = radius * si * cj;
      const y = radius * ci;
      const z = radius * si * sj;
      vertices.push(x, y, z);
    }
  }

  const indices = [];
  for (let i = 0; i < verticalSegments; i++) {
    for (let j = 0; j < verticalSegments; j++) {
      const p0 = i * verticalSegments + j;
      const p1 = p0 + verticalSegments;
      const p2 = p1 + 1;
      const p3 = p0 + 1;

      indices.push(p0, p1, p2);
      indices.push(p0, p2, p3);
    }
  }

  return {
    vertices: new Float32Array(vertices),
    indices: new Uint16Array(indices),
  };
};

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;

  uniform mat4 u_MvpMatrix;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec3 v_Position;
  varying vec3 v_Normal;
  
  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec4 u_Color;
  uniform vec3 u_LightColor;
  uniform vec3 u_LightPosition;

  varying vec3 v_Position;
  varying vec3 v_Normal;

  void main() {
    vec3 normal = normalize(v_Normal);
    vec3 light = normalize(u_LightPosition - v_Position);
    float diffusePower = clamp(dot(normal, light), 0.0, 1.0);
    vec3 diffuseColor = u_Color.rgb * u_LightColor * diffusePower;
    gl_FragColor = vec4(diffuseColor, u_Color.a);
  }
`;

const gl = getWebGLContext();
gl.enable(gl.DEPTH_TEST);
const program = bindWebGLProgram(gl, [
  { type: gl.VERTEX_SHADER, source: vertexShader },
  { type: gl.FRAGMENT_SHADER, source: fragmentShader },
]);
const aPosition = gl.getAttribLocation(program, "a_Position");
const aNormal = gl.getAttribLocation(program, "a_Normal");
const uColor = gl.getUniformLocation(program, "u_Color");
const uLightColor = gl.getUniformLocation(program, "u_LightColor");
const uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const uNormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");

/**
 * Setups sphere vertices and normals
 */
const { vertices, indices } = createSphere(2, 36, 36);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
// in sphere, it is possible to use vertices as normals
gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aNormal);

const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
console.log(vertices, indices);

/**
 * Setups mvp matrix and normal matrix
 */
const modelMatrix = mat4.fromRotation(
  mat4.create(),
  glMatrix.toRadian(0),
  vec3.fromValues(1, 0.5, 0)
);
gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
const viewMatrix = mat4.lookAt(
  mat4.create(),
  vec3.fromValues(0, 0, 6),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projMatrix = mat4.create();
const mvpMatrix = mat4.create();
const updateProjMatrix = () => {
  mat4.perspective(projMatrix, glMatrix.toRadian(50), gl.canvas.width / gl.canvas.height, 1, 1000);
};
const updateMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
updateProjMatrix();
updateMvpMatrix();

const normaMatrix = mat4.create();
mat4.invert(normaMatrix, modelMatrix);
mat4.transpose(normaMatrix, normaMatrix);
gl.uniformMatrix4fv(uNormalMatrix, false, normaMatrix);

/**
 * Setups light
 */
gl.uniform3f(uLightColor, 1, 1, 1);
gl.uniform3f(uLightPosition, 10, 10, 10);

const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  /**
   * red color for drawing outline
   */
  gl.uniform4f(uColor, 0, 0, 0, 0.2);
  gl.drawElements(gl.LINE_STRIP, indices.length, gl.UNSIGNED_SHORT, 0);
  /**
   * grey color for drawing outline
   */
  gl.uniform4f(uColor, 0.5, 0.5, 0.5, 0.4);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
};
render();

getCanvasResizeObserver(() => {
  updateProjMatrix();
  updateMvpMatrix();
  render();
});
