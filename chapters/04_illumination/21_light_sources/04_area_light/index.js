import { glMatrix, mat4, quat, vec3, vec4 } from "gl-matrix";
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

  uniform vec3 u_DiffuseLightColor;
  uniform vec3 u_SpecularLightColor;
  uniform float u_LightSpecularShininessExponent;

  uniform float u_LightDiffuseIntensity;
  uniform float u_LightSpecularIntensity;
  uniform float u_LightAttenuationA;
  uniform float u_LightAttenuationB;
  uniform float u_LightAttenuationC;
  
  uniform vec3 u_LightPosition;
  uniform vec3 u_AreaLightViewingPlaneNormal; // this is also viewing direction
  uniform vec3 u_AreaLightViewingPlanePosition;
  uniform float u_AreaLightViewingPlaneDistance;
  uniform mat4 u_AreaLightInvertModelMatrix;
  uniform float u_AreaLightMinX;
  uniform float u_AreaLightMaxX;
  uniform float u_AreaLightMinY;
  uniform float u_AreaLightMaxY;

  uniform vec3 u_CameraPosition;

  uniform vec3 u_DiffuseReflection;
  uniform vec3 u_SpecularReflection;

  varying vec3 v_AmbientColor;
  varying vec3 v_Normal;
  varying vec3 v_Position;

  /**
   * Calculates area light visibility
   */
  float areaLightStep(vec3 lightDirection) {
    // return 0.0 if width or height is 0.0
    if (u_AreaLightMaxX - u_AreaLightMinX == 0.0 || u_AreaLightMaxY - u_AreaLightMinY == 0.0)
      return 0.0;
      
    // returns 0.0 if position behind area light
    float cosineAngle = dot(-lightDirection, u_AreaLightViewingPlaneNormal);
    if (cosineAngle < 0.0)
      return 0.0;

    // returns 0.0 if position behind area light plane
    float cosineAnglePlane = dot(v_Position - u_AreaLightViewingPlanePosition, u_AreaLightViewingPlaneNormal);
    if (cosineAnglePlane < 0.0)
      return 0.0;

    // projects current position to area light plane and normalizes to XY plane
    float distBase = distance(vec3(0.0, 0.0, 0.0), u_AreaLightViewingPlaneNormal);
    float distToPlane = cosineAnglePlane / distBase;
    float scale = distToPlane / cosineAngle;
    vec3 forward = lightDirection * scale;
    vec3 projected = v_Position + forward;

    vec4 invertTransformed = u_AreaLightInvertModelMatrix * vec4(projected, 1.0);

    // after invert transformation, point stays on XY plane
    float x = invertTransformed.x;
    float y = invertTransformed.y;

    if (x >= u_AreaLightMinX && x <= u_AreaLightMaxX && y >= u_AreaLightMinY && y <= u_AreaLightMaxY) {
      float smoothX = smoothstep(u_AreaLightMaxX, 0.0, abs(x));
      float smoothY = smoothstep(u_AreaLightMaxY, 0.0, abs(y));
      return min(smoothX, smoothY);
    } else {
      return 0.0;
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

    float step = areaLightStep(lightDirection);
    if (step == 0.0) {
      // outside outer limits, no area light
      gl_FragColor = vec4(v_AmbientColor, 1.0);
    } else {
      // inside area light
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
 * Setups area light
 */
const areaLightPosition = vec4.fromValues(0, 0, 0, 1);
const areaLightViewingPlaneNormal = vec4.fromValues(0, 0, 1, 0); // normalized, also light viewing direction
const areaLightViewingPlaneDistance = 1;
const areaLightViewingPlanePosition = vec4.create();
// calculates plane position
{
  const lightPosition = areaLightPosition.slice(0, 3);
  const planeNormal = areaLightViewingPlaneNormal.slice(0, 3);
  const forward = vec3.scale(vec3.create(), planeNormal, areaLightViewingPlaneDistance);
  const planePosition = vec3.add(forward, lightPosition, forward);
  vec4.set(areaLightViewingPlanePosition, planePosition[0], planePosition[1], planePosition[2], 1);
}
const areaLightModelMatrix = mat4.fromRotationTranslation(
  mat4.create(),
  quat.fromEuler(quat.create(), 0, 180, 0),
  vec3.fromValues(0.8, 0, 4)
);
const areaLightInvertModelMatrix = mat4.invert(mat4.create(), areaLightModelMatrix);
const areaLightNormalMatrix = mat4.transpose(mat4.create(), areaLightInvertModelMatrix);
// transform light
vec4.transformMat4(areaLightPosition, areaLightPosition, areaLightModelMatrix);
vec4.transformMat4(
  areaLightViewingPlanePosition,
  areaLightViewingPlanePosition,
  areaLightModelMatrix
);
vec4.transformMat4(areaLightViewingPlaneNormal, areaLightViewingPlaneNormal, areaLightNormalMatrix);
const uLightPosition = gl.getUniformLocation(program, "u_LightPosition");
const uAreaLightPlaneNormal = gl.getUniformLocation(program, "u_AreaLightViewingPlaneNormal");
const uAreaLightPlanePosition = gl.getUniformLocation(program, "u_AreaLightViewingPlanePosition");
const uAreaLightInvertModelMatrix = gl.getUniformLocation(program, "u_AreaLightInvertModelMatrix");
const uAreaLightViewingPlaneDistance = gl.getUniformLocation(
  program,
  "u_AreaLightViewingPlaneDistance"
);
const uAreaLightMaxX = gl.getUniformLocation(program, "u_AreaLightMaxX");
const uAreaLightMaxY = gl.getUniformLocation(program, "u_AreaLightMaxY");
const uAreaLightMinX = gl.getUniformLocation(program, "u_AreaLightMinX");
const uAreaLightMinY = gl.getUniformLocation(program, "u_AreaLightMinY");
gl.uniform3fv(uLightPosition, areaLightPosition.slice(0, 3));
gl.uniform3fv(uAreaLightPlaneNormal, areaLightViewingPlaneNormal.slice(0, 3));
gl.uniform3fv(uAreaLightPlanePosition, areaLightViewingPlanePosition.slice(0, 3));
gl.uniformMatrix4fv(uAreaLightInvertModelMatrix, false, areaLightInvertModelMatrix);
gl.uniform1f(uAreaLightViewingPlaneDistance, areaLightViewingPlaneDistance);

const areaLightExtentInputs = [
  document.getElementById("areaLightWidth"),
  document.getElementById("areaLightHeight"),
];
areaLightExtentInputs.forEach((input) => {
  input.addEventListener("input", () => {
    setAreaLightExtent();
    render();
  });
});
const setAreaLightExtent = () => {
  const width = parseFloat(areaLightExtentInputs[0].value);
  const height = parseFloat(areaLightExtentInputs[1].value);

  const maxx = width / 2;
  const maxy = height / 2;
  const minx = -maxx;
  const miny = -maxy;

  gl.uniform1f(uAreaLightMinX, minx);
  gl.uniform1f(uAreaLightMinY, miny);
  gl.uniform1f(uAreaLightMaxX, maxx);
  gl.uniform1f(uAreaLightMaxY, maxy);
};
setAreaLightExtent();

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
