import { glMatrix, mat4, vec3 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../../libs/common";
import { createSphereTriangulated } from "../../../libs/geom/sphere";

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
  uniform float u_LightSpecularShininessExponent;

  uniform float u_LightDiffuseIntensity;
  uniform float u_LightSpecularIntensity;
  uniform float u_LightAttenuationA;
  uniform float u_LightAttenuationB;
  uniform float u_LightAttenuationC;

  uniform vec3 u_SpotlightDirection;
  uniform float u_SpotlightOuterLimit;
  uniform float u_SpotlightInnerLimit;

  uniform vec3 u_CameraPosition;

  uniform vec3 u_DiffuseReflection;
  uniform vec3 u_SpecularReflection;

  varying vec3 v_AmbientColor;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  /**
   * Calculates spotlight step
   */
  float spotlightStep(vec3 lightDirection) {
    float limit = dot(-lightDirection, normalize(-u_SpotlightDirection));

    if (limit >= u_SpotlightInnerLimit) {
      return 1.0;
    } else if (limit <= u_SpotlightOuterLimit) {
      return 0.0;
    } else {
      return smoothstep(u_SpotlightOuterLimit, u_SpotlightInnerLimit, limit);
    }
  }

  /**
   * Calculates diffuse reflection color
   */
  vec3 diffuse(float step, float attenuation, vec3 normal, vec3 lightDirection) {
    float cosine = max(dot(normal, lightDirection), 0.0);
    return step * attenuation * u_LightDiffuseIntensity * u_DiffuseLightColor * u_DiffuseReflection * cosine;
  }

  /**
   * Calculates specular reflection color
   */
  vec3 specular(float step, float attenuation, vec3 normal, vec3 reflectionDirection, vec3 cameraDirection) {
    float cosine = max(dot(reflectionDirection, cameraDirection), 0.0);
    float power = pow(cosine, u_LightSpecularShininessExponent);
    return step * attenuation * u_LightSpecularIntensity * u_SpecularLightColor * u_SpecularReflection * power;
  }

  void main() {
    vec3 lightDirection = normalize(u_LightPosition - v_Position);

    float step = spotlightStep(lightDirection);
    if (step == 0.0) {
      // outside outer limits, no spotlight
      gl_FragColor = vec4(v_AmbientColor, 1.0);
    } else {
      // inside spotlight
      vec3 normal = normalize(v_Normal);
      vec3 cameraDirection = normalize(u_CameraPosition - v_Position);
      vec3 reflectionDirection = 2.0 * normal * dot(normal, lightDirection) - lightDirection;
      reflectionDirection = normalize(reflectionDirection);

      float distanceToLight = distance(v_Position, u_LightPosition);
      float attenuation = 1.0 / (u_LightAttenuationA + u_LightAttenuationB * distanceToLight + u_LightAttenuationC * pow(distanceToLight, 2.0));

      vec3 diffuseColor = diffuse(step, attenuation, normal, lightDirection);
      vec3 specularColor = specular(step, attenuation, normal, reflectionDirection, cameraDirection);
  
      gl_FragColor = vec4(v_AmbientColor + diffuseColor + specularColor, 1.0);
    }
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
const modelMatrix = mat4.create();
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
gl.uniform3f(uLightPosition, 3, 1, 5);

/**
 * Setups spotlight direction
 */
const uSpotlightDirection = gl.getUniformLocation(program, "u_SpotlightDirection");
gl.uniform3f(uSpotlightDirection, 3, 1, 5);

/**
 * Setups spotlight outer limits
 */
const uSpotlightOuterLimit = gl.getUniformLocation(program, "u_SpotlightOuterLimit");
const spotlightOuterLimitInput = document.getElementById("spotlightOuterLimit");
spotlightOuterLimitInput.addEventListener("input", () => {
  setSpotlightOuterLimit();
  render();
});
const setSpotlightOuterLimit = () => {
  gl.uniform1f(
    uSpotlightOuterLimit,
    Math.cos(glMatrix.toRadian(parseFloat(spotlightOuterLimitInput.value)))
  );
};
setSpotlightOuterLimit();

/**
 * Setups spotlight inner limits
 */
const uSpotlightInnerLimit = gl.getUniformLocation(program, "u_SpotlightInnerLimit");
const spotlightInnerLimitInput = document.getElementById("spotlightInnerLimit");
spotlightInnerLimitInput.addEventListener("input", () => {
  setSpotlightInnerLimit();
  render();
});
const setSpotlightInnerLimit = () => {
  gl.uniform1f(
    uSpotlightInnerLimit,
    Math.cos(glMatrix.toRadian(parseFloat(spotlightInnerLimitInput.value)))
  );
};
setSpotlightInnerLimit();

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
    render();
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
    render();
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
    render();
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
 * Setups light specular shininess exponent
 */
const uLightSpecularShininessExponent = gl.getUniformLocation(
  program,
  "u_LightSpecularShininessExponent"
);
const uLightSpecularShininessExponentInput = document.getElementById("specularShininessExponent");
uLightSpecularShininessExponentInput.addEventListener("input", () => {
  setLightSpecularShininessExponent();
  render();
});
const setLightSpecularShininessExponent = () => {
  gl.uniform1f(
    uLightSpecularShininessExponent,
    parseFloat(uLightSpecularShininessExponentInput.value)
  );
};
setLightSpecularShininessExponent();

/**
 * Setups sphere
 */
const uNormal = gl.getAttribLocation(program, "a_Normal");
const aPosition = gl.getAttribLocation(program, "a_Position");
const { normals, vertices } = createSphereTriangulated(2, 24, 48);
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
const render = () => {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);
};
render();

getCanvasResizeObserver(() => {
  setMvpMatrix();
  render();
});
