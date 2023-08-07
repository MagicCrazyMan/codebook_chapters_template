import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../../libs/common";
import { createSphere } from "../../../libs/geom/sphere";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Normal;
  
  uniform vec3 u_AmbientReflection;

  uniform mat4 u_MvpMatrix;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;

  uniform vec3 u_AmbientLightColor;

  varying vec3 v_AmbientColor;

  varying vec3 v_Normal;
  varying vec3 v_Position;

  /**
   * Calculates ambient reflection color
   */
  vec3 ambient() {
    return u_AmbientLightColor * u_AmbientReflection;
  }

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Position = vec3(u_ModelMatrix * a_Position);
    v_Normal = vec3(u_NormalMatrix * a_Normal);

    v_AmbientColor = ambient();
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  uniform vec3 u_LightPosition;
  uniform vec3 u_DiffuseLightColor;
  uniform vec3 u_SpecularLightColor;
  uniform float u_LightSpecularExponent;

  uniform float u_LightDiffuseIntensity;
  uniform float u_LightSpecularIntensity;
  uniform float u_LightAttenuationA;
  uniform float u_LightAttenuationB;
  uniform float u_LightAttenuationC;

  uniform vec3 u_CameraPosition;

  uniform vec3 u_DiffuseReflection;
  uniform vec3 u_SpecularReflection;
  varying vec3 v_AmbientColor;

  varying vec3 v_Normal;
  varying vec3 v_Position;

  /**
   * Calculates diffuse reflection color
   */
  vec3 diffuse(float attenuation, vec3 normal, vec3 lightDirection) {
    float cosine = max(dot(normal, lightDirection), 0.0);
    return attenuation * u_LightDiffuseIntensity * u_DiffuseLightColor * u_DiffuseReflection * cosine;
  }

  /**
   * Calculates specular reflection color
   */
  vec3 specular(float attenuation, vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
    float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
    float power = pow(cosine, u_LightSpecularExponent);
    return attenuation * u_LightSpecularIntensity * u_SpecularLightColor * u_SpecularReflection * power;
  }

  void main() {
    vec3 normal = normalize(v_Position);
    vec3 lightDirection = normalize(u_LightPosition - v_Position);
    vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
    vec3 reflectionDirection = 2.0 * normal * dot(normal, lightDirection) - lightDirection;
    reflectionDirection = normalize(reflectionDirection);

    float distanceToLight = distance(v_Position, u_LightPosition);
    float attenuation = 1.0 / (u_LightAttenuationA + u_LightAttenuationB * distanceToLight + u_LightAttenuationC * pow(distanceToLight, 2.0));
    
    vec3 diffuseColor = diffuse(attenuation, normal, lightDirection);
    vec3 specularColor = specular(attenuation, normal, reflectionDirection, cameraDirection);

    gl_FragColor = vec4(v_AmbientColor + diffuseColor + specularColor, 1.0);
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
const uModelMatrix = gl.getUniformLocation(program, "u_ModelMatrix");
const uNormalMatrix = gl.getUniformLocation(program, "u_NormalMatrix");
const uCameraPosition = gl.getUniformLocation(program, "u_CameraPosition");
// const modelMatrix = mat4.create();
const modelMatrix = mat4.fromYRotation(mat4.create(), glMatrix.toRadian(30));
const cameraPosition = vec3.fromValues(0, 0, 6);
const viewMatrix = mat4.lookAt(
  mat4.create(),
  cameraPosition,
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);
const projectionMatrix = mat4.create();
const mvpMatrix = mat4.create();
const normalMatrix = mat4.create();
mat4.invert(normalMatrix, modelMatrix);
mat4.transpose(normalMatrix, normalMatrix);
gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
gl.uniformMatrix4fv(uNormalMatrix, false, normalMatrix);
gl.uniform3fv(uCameraPosition, cameraPosition);
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
 * Setups light position
 */
const uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
const lightPosition = vec4.create();
const lightOriginPosition = vec4.fromValues(0, 0, 0, 1);
const lightTranslation = vec3.fromValues(0, 5, 5);
const lightModelMatrix = mat4.create();
const rps = glMatrix.toRadian(20); // Radian Per Second
let lastAnimationTime = 0;
let currentRotation = 0;
const updateLightPosition = (time) => {
  currentRotation += ((time - lastAnimationTime) / 1000) * rps;
  currentRotation %= 2 * Math.PI;

  mat4.identity(lightModelMatrix, lightModelMatrix);
  mat4.rotateY(lightModelMatrix, lightModelMatrix, currentRotation);
  mat4.translate(lightModelMatrix, lightModelMatrix, lightTranslation);
  vec4.transformMat4(lightPosition, lightOriginPosition, lightModelMatrix);

  gl.uniform3f(uLightPosition, lightPosition[0], lightPosition[1], lightPosition[2]);
};

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
 * Setups diffuse light color
 */
const uDiffuseLightColor = gl.getUniformLocation(program, "u_DiffuseLightColor");
const diffuseLightColorInputs = [
  document.getElementById("diffuseColorR"),
  document.getElementById("diffuseColorG"),
  document.getElementById("diffuseColorB"),
];
diffuseLightColorInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setDiffuseLightColor();
  });
});
const setDiffuseLightColor = () => {
  gl.uniform3f(
    uDiffuseLightColor,
    parseFloat(diffuseLightColorInputs[0].value),
    parseFloat(diffuseLightColorInputs[1].value),
    parseFloat(diffuseLightColorInputs[2].value)
  );
};
setDiffuseLightColor();

/**
 * Setups specular light color
 */
const uSpecularLightColor = gl.getUniformLocation(program, "u_SpecularLightColor");
const specularLightColorInputs = [
  document.getElementById("specularColorR"),
  document.getElementById("specularColorG"),
  document.getElementById("specularColorB"),
];
specularLightColorInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setSpecularLightColor();
  });
});
const setSpecularLightColor = () => {
  gl.uniform3f(
    uSpecularLightColor,
    parseFloat(specularLightColorInputs[0].value),
    parseFloat(specularLightColorInputs[1].value),
    parseFloat(specularLightColorInputs[2].value)
  );
};
setSpecularLightColor();

/**
 * Setups light intensity and factors
 */
const uLightDiffuseIntensity = gl.getUniformLocation(program, "u_LightDiffuseIntensity");
const uLightSpecularIntensity = gl.getUniformLocation(program, "u_LightSpecularIntensity");
const uLightAttenuationA = gl.getUniformLocation(program, "u_LightAttenuationA");
const uLightAttenuationB = gl.getUniformLocation(program, "u_LightAttenuationB");
const uLightAttenuationC = gl.getUniformLocation(program, "u_LightAttenuationC");
const lightAttenuationInputs = [
  document.getElementById("diffuseIntensity"),
  document.getElementById("specularIntensity"),
  document.getElementById("attenuationA"),
  document.getElementById("attenuationB"),
  document.getElementById("attenuationC"),
];
lightAttenuationInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setLightAttenuation();
  });
});
const setLightAttenuation = () => {
  gl.uniform1f(uLightDiffuseIntensity, parseFloat(lightAttenuationInputs[0].value));
  gl.uniform1f(uLightSpecularIntensity, parseFloat(lightAttenuationInputs[1].value));
  gl.uniform1f(uLightAttenuationA, parseFloat(lightAttenuationInputs[2].value));
  gl.uniform1f(uLightAttenuationB, parseFloat(lightAttenuationInputs[3].value));
  gl.uniform1f(uLightAttenuationC, parseFloat(lightAttenuationInputs[4].value));
};
setLightAttenuation();

/**
 * Setups light specular exponent
 */
const uLightSpecularExponent = gl.getUniformLocation(program, "u_LightSpecularExponent");
const specularExponentInput = document.getElementById("specularExponent");
specularExponentInput.addEventListener("input", () => {
  setLightSpecularExponent();
});
const setLightSpecularExponent = () => {
  gl.uniform1f(uLightSpecularExponent, parseFloat(specularExponentInput.value));
};
setLightSpecularExponent();

/**
 * Setups sphere
 */
const uNormal = gl.getAttribLocation(program, "a_Normal");
const aPosition = gl.getAttribLocation(program, "a_Position");
const { normals, vertices, indices } = createSphere(2, 24, 24);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
const normalsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
gl.vertexAttribPointer(uNormal, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(uNormal);
const indicesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

/**
 * Setups ambient reflections
 */
const ambientReflection = vec3.fromValues(0.4, 0.4, 1.0);
const uAmbientReflection = gl.getUniformLocation(program, "u_AmbientReflection");
gl.uniform3fv(uAmbientReflection, ambientReflection);

/**
 * Setups diffuse reflections
 *
 * Same as ambient reflections
 */
const diffuseReflection = ambientReflection;
const uDiffuseReflection = gl.getUniformLocation(program, "u_DiffuseReflection");
gl.uniform3fv(uDiffuseReflection, diffuseReflection);

/**
 * Setups specular reflections.
 *
 * Same as ambient reflections
 */
const specularReflection = ambientReflection;
const uSpecularReflection = gl.getUniformLocation(program, "u_SpecularReflection");
gl.uniform3fv(uSpecularReflection, specularReflection);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
const render = (time) => {
  updateLightPosition(time);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer);
  gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);

  requestAnimationFrame(render);
  lastAnimationTime = time;
};
render(0);

getCanvasResizeObserver(setMvpMatrix);
