import { glMatrix, mat4, vec3 } from "gl-matrix";
import {
  bindWebGLProgram,
  getCanvasResizeObserver,
  getWebGLContext,
} from "../../../libs/common.js";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  attribute vec4 a_Normal;

  uniform mat4 u_MvpMatrix;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec4 v_Color;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = vec3(u_NormalMatrix * a_Normal);
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec3 u_CameraPosition;
  uniform vec3 u_AmbientLight;
  uniform vec3 u_LightColor;
  uniform vec3 u_LightPosition;
  uniform float u_LightSpecularExponent;
  uniform float u_LightIntensity;
  uniform vec3 u_LightDirection;
  uniform float u_InnerLightLimit;
  uniform float u_OuterLightLimit;

  varying vec4 v_Color;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  float spotlightStep(in float limit) {
    if (limit >= u_InnerLightLimit) {
      return 1.0;
    } else if (limit < u_OuterLightLimit) {
      return 0.0;
    } else {
      return smoothstep(u_OuterLightLimit, u_InnerLightLimit, limit);
    }
  }

  void main() {
    vec3 normal = normalize(v_Normal);
    vec3 toLight = normalize(u_LightPosition - v_Position);
    vec3 toCamera = normalize(u_CameraPosition - v_Position);
    vec3 lightDirection = normalize(u_LightDirection);

    // calculates ambient
    vec3 ambientColor = v_Color.rgb * u_AmbientLight;

    // determines is surface position inside spotlight limit
    float spotStep = spotlightStep(dot(-1.0 * toLight, lightDirection));
    if (spotStep != 0.0) {
      // calculates cosine between light and normal
      float dotLightNormal = dot(normal, toLight);

      // calculates smooth light
      vec3 smoothLight = u_LightColor * spotStep;

      // calculates falloff
      float dist = distance(v_Position, u_LightPosition);
      float falloffPower = clamp(u_LightIntensity / pow(dist, 2.0), 0.0, 1.0);
      vec3 falloffLightColor = smoothLight * falloffPower;
  
      // calculates specular
      vec3 specularProj = 2.0 * normal * dotLightNormal - 1.0 * toLight;
      specularProj = normalize(specularProj);
      float specularCosine = clamp(dot(toCamera, specularProj), 0.0, 1.0);
      float specularPower = pow(specularCosine, u_LightSpecularExponent);
      vec3 specularColor = falloffLightColor * specularPower;
      vec3 objectColor = v_Color.rgb * (1.0 - specularPower);
  
      // calculates diffuse
      float diffusePower = clamp(dotLightNormal, 0.0, 1.0);
      vec3 diffuseColor = objectColor * falloffLightColor * diffusePower;
  
      gl_FragColor = vec4(ambientColor + specularColor + diffuseColor , v_Color.a);
    } else {
      gl_FragColor = vec4(ambientColor , v_Color.a);
    }
  }
`;

const gl = getWebGLContext();
const program = bindWebGLProgram(gl, [
  { source: vertexShader, type: gl.VERTEX_SHADER },
  { source: fragmentShader, type: gl.FRAGMENT_SHADER },
]);

/**
 * Setups mvp and normal matrix
 */
const uMvpMatrix = gl.getUniformLocation(program, "u_MvpMatrix");
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const uNormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
const uCameraPosition = gl.getUniformLocation(program, "u_CameraPosition");
const rps = glMatrix.toRadian(20); // Radian Per Second
let lastAnimationTime = 0;
let currentRotation = 0;
const modelMatrix = mat4.create();
const cameraPosition = vec3.fromValues(6, 6, 14);
gl.uniform3fv(uCameraPosition, cameraPosition);
const viewMatrix = mat4.lookAt(
  mat4.create(),
  cameraPosition,
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
const normalMatrix = mat4.create();
const setProjectionMatrix = () => {
  mat4.perspective(
    projectionMatrix,
    glMatrix.toRadian(30),
    gl.canvas.width / gl.canvas.height,
    1,
    100
  );
};
const setModelMatrix = (time) => {
  currentRotation += ((time - lastAnimationTime) / 1000) * rps;
  currentRotation %= 2 * Math.PI;
  mat4.fromYRotation(modelMatrix, currentRotation);
  gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
};
const setMvpMatrix = () => {
  mat4.identity(mvpMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, projectionMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, viewMatrix);
  mat4.multiply(mvpMatrix, mvpMatrix, modelMatrix);
  gl.uniformMatrix4fv(uMvpMatrix, false, mvpMatrix);
};
const setNormalMatrix = () => {
  mat4.invert(normalMatrix, modelMatrix);
  mat4.transpose(normalMatrix, normalMatrix);
  gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
};
getCanvasResizeObserver(() => {
  setProjectionMatrix();
  setMvpMatrix();
});

/**
 * Setups cube normals
 */
// prettier-ignore
const normals = new Float32Array([
  0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,   0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
  1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,   1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
  0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,   0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
 -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
  0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,   0.0,-1.0, 0.0,  // v7-v4-v3-v2 down
  0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0,   0.0, 0.0,-1.0   // v4-v7-v6-v5 back
]);
const normalsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
const uNormals = gl.getAttribLocation(program, "a_Normal");
gl.vertexAttribPointer(uNormals, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(uNormals);

/**
 * Setups light color
 */
const uLightColor = gl.getUniformLocation(program, "u_LightColor");
const lightColorInputs = [
  document.getElementById("colorR"),
  document.getElementById("colorG"),
  document.getElementById("colorB"),
];
lightColorInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setLightColor();
  });
});
const setLightColor = () => {
  gl.uniform3f(
    uLightColor,
    parseFloat(lightColorInputs[0].value),
    parseFloat(lightColorInputs[1].value),
    parseFloat(lightColorInputs[2].value)
  );
};
setLightColor();
/**
 * Setups light position
 */
const uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
const lightPosition = vec3.fromValues(5, 5, 5);
gl.uniform3fv(uLightPosition, lightPosition);
/**
 * Setups light position
 */
const uLightSpecularExponent = gl.getUniformLocation(program, "u_LightSpecularExponent");
const lightSpecularInput = document.getElementById("specularExponent");
lightSpecularInput.addEventListener("input", () => {
  setLightSpecularExponent();
});
const setLightSpecularExponent = () => {
  gl.uniform1f(uLightSpecularExponent, parseFloat(lightSpecularInput.value));
};
setLightSpecularExponent();
/**
 * Setups light intensity
 */
const uLightIntensity = gl.getUniformLocation(program, "u_LightIntensity");
const lightIntensityInput = document.getElementById("intensity");
lightIntensityInput.addEventListener("input", () => {
  setLightIntensityExponent();
});
const setLightIntensityExponent = () => {
  gl.uniform1f(uLightIntensity, parseFloat(lightIntensityInput.value));
};
setLightIntensityExponent();
/**
 * Setups light limitation
 */
const uInnerLightLimit = gl.getUniformLocation(program, "u_InnerLightLimit");
const innerLightLimitInput = document.getElementById("innerLimit");
innerLightLimitInput.addEventListener("input", () => {
  setInnerLightLimit();
});
const setInnerLightLimit = () => {
  gl.uniform1f(
    uInnerLightLimit,
    Math.cos(glMatrix.toRadian(parseFloat(innerLightLimitInput.value)))
  );
};
setInnerLightLimit();
const uOuterLightLimit = gl.getUniformLocation(program, "u_OuterLightLimit");
const outerLightLimitInput = document.getElementById("outerLimit");
outerLightLimitInput.addEventListener("input", () => {
  setOuterLightLimit();
});
const setOuterLightLimit = () => {
  gl.uniform1f(
    uOuterLightLimit,
    Math.cos(glMatrix.toRadian(parseFloat(outerLightLimitInput.value)))
  );
};
setOuterLightLimit();
/**
 * Setups light direction
 */
const uLightDirection = gl.getUniformLocation(program, "u_LightDirection");
const lightLookAt = vec3.fromValues(0, 0, 0);
gl.uniform3fv(uLightDirection, vec3.subtract(vec3.create(), lightLookAt, lightPosition));

/**
 * Setups ambient light
 */
const uAmbientLight = gl.getUniformLocation(program, "u_AmbientLight");
const ambientInputs = [
  document.getElementById("ambientColorR"),
  document.getElementById("ambientColorG"),
  document.getElementById("ambientColorB"),
];
ambientInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setAmbientLightColor();
  });
});
const setAmbientLightColor = () => {
  gl.uniform3f(
    uAmbientLight,
    parseFloat(ambientInputs[0].value),
    parseFloat(ambientInputs[1].value),
    parseFloat(ambientInputs[2].value)
  );
};
setAmbientLightColor();

/**
 * Setups cube
 *   v6----- v5
 *  /|      /|
 * v1------v0|
 * | |     | |
 * | |v7---|-|v4
 * |/      |/
 * v2------v3
 */
// prettier-ignore
const vertices = new Float32Array([
  2.0, 2.0, 2.0,  -2.0, 2.0, 2.0,  -2.0,-2.0, 2.0,   2.0,-2.0, 2.0,  // v0-v1-v2-v3 front
  2.0, 2.0, 2.0,   2.0,-2.0, 2.0,   2.0,-2.0,-2.0,   2.0, 2.0,-2.0,  // v0-v3-v4-v5 right
  2.0, 2.0, 2.0,   2.0, 2.0,-2.0,  -2.0, 2.0,-2.0,  -2.0, 2.0, 2.0,  // v0-v5-v6-v1 up
 -2.0, 2.0, 2.0,  -2.0, 2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0,-2.0, 2.0,  // v1-v6-v7-v2 left
 -2.0,-2.0,-2.0,   2.0,-2.0,-2.0,   2.0,-2.0, 2.0,  -2.0,-2.0, 2.0,  // v7-v4-v3-v2 down
  2.0,-2.0,-2.0,  -2.0,-2.0,-2.0,  -2.0, 2.0,-2.0,   2.0, 2.0,-2.0   // v4-v7-v6-v5 back
]);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
const aPosition = gl.getAttribLocation(program, "a_Position");
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);

// prettier-ignore
const colors = new Float32Array([
  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  0.4, 0.4, 1.0,  // v0-v1-v2-v3 front(blue)
  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  0.4, 1.0, 0.4,  // v0-v3-v4-v5 right(green)
  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  1.0, 0.4, 0.4,  // v0-v5-v6-v1 up(red)
  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  1.0, 1.0, 0.4,  // v1-v6-v7-v2 left(yellow)
  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  1.0, 1.0, 1.0,  // v7-v4-v3-v2 bottom(white)
  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0,  0.4, 1.0, 1.0   // v4-v7-v6-v5 back(cyan)
]);
const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
const aColor = gl.getAttribLocation(program, "a_Color");
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);

// prettier-ignore
const indices = new Uint8Array([
  0,  1,  2,  0,  2,  3,    // front
  4,  5,  6,  4,  6,  7,    // right
  8,  9, 10,  8, 10, 11,    // up
 12, 13, 14, 12, 14, 15,    // left
 16, 17, 18, 16, 18, 19,    // down
 20, 21, 22, 20, 22, 23     // back
]);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

gl.enable(gl.DEPTH_TEST);
const render = (time) => {
  setModelMatrix(time);
  setNormalMatrix();
  setMvpMatrix();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_BYTE, 0);

  requestAnimationFrame(render);
  lastAnimationTime = time;
};
render(0);
