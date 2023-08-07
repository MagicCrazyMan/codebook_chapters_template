import { glMatrix, mat4, vec3, vec4 } from "gl-matrix";
import { bindWebGLProgram, getCanvasResizeObserver, getWebGLContext } from "../../../libs/common";
import { createSphereTriangulated } from "../../../libs/geom/sphere";

const vertexShader = `
  attribute vec4 a_Position;
  attribute vec4 a_Color;

  uniform mat4 u_MvpMatrix;

  varying vec4 v_Color;

  void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_Color = a_Color;
  }
`;
const fragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
  #else
    precision mediump float;
  #endif

  varying vec4 v_Color;

  void main() {
    gl_FragColor = v_Color;
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
 * Setups sphere
 */
const aPosition = gl.getAttribLocation(program, "a_Position");
const aColor = gl.getAttribLocation(program, "a_Color");
const { vertices } = createSphereTriangulated(2, 24, 48);
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aPosition);
const colors = new Float32Array(vertices.length);
const colorsBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(aColor);

/**
 * Sphere reflection.
 * For ambient, diffuse and specular.
 */
const faceReflection = vec3.fromValues(0.4, 0.4, 1.0);

/**
 * Light position
 */
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
};

/**
 * Setups light properties inputs
 */
const ambientLightInputR = document.getElementById("ambientColorR");
const ambientLightInputG = document.getElementById("ambientColorG");
const ambientLightInputB = document.getElementById("ambientColorB");
const diffuseLightInputR = document.getElementById("diffuseColorR");
const diffuseLightInputG = document.getElementById("diffuseColorG");
const diffuseLightInputB = document.getElementById("diffuseColorB");
const specularLightInputR = document.getElementById("specularColorR");
const specularLightInputG = document.getElementById("specularColorG");
const specularLightInputB = document.getElementById("specularColorB");
const diffuseIntensityInput = document.getElementById("diffuseIntensity");
const specularIntensityInput = document.getElementById("specularIntensity");
const specularExponentInput = document.getElementById("specularShininessExponent");
const attenuationFactorInputA = document.getElementById("attenuationA");
const attenuationFactorInputB = document.getElementById("attenuationB");
const attenuationFactorInputC = document.getElementById("attenuationC");

const normalMatrixTemp = mat4.create();
const normal4Temp = vec4.create();
const normal3Temp = vec3.create();
const centroid4Temp = vec4.create();
const centroid3Temp = vec3.create();
const lightDirectionTemp = vec3.create();
const reflectionDirectionTemp = vec3.create();
const cameraDirectionTemp = vec3.create();
const ambientLightColorTemp = vec3.create();
const diffuseLightColorTemp = vec3.create();
const specularLightColorTemp = vec3.create();
const ambientColorTemp = vec3.create();
const specularColorTemp = vec3.create();
const diffuseColorTemp = vec3.create();
const colorTemp = vec3.create();
const flatShading = () => {
  /**
   * Calculates ambient color
   */
  const ambient = () => {
    const ambientReflection = faceReflection;
    vec3.mul(ambientColorTemp, ambientLightColorTemp, ambientReflection);
  };
  /**
   * Calculates diffuse color
   */
  const diffuse = (attenuation, lightDirection, normal) => {
    const diffuseReflection = faceReflection;
    const cosine = Math.max(vec3.dot(normal, lightDirection), 0.0);

    vec3.mul(diffuseColorTemp, diffuseLightColorTemp, diffuseReflection);
    vec3.scale(diffuseColorTemp, diffuseColorTemp, diffuseLightIntensity * attenuation * cosine);
  };
  /**
   * Calculates specular color
   */
  const specular = (attenuation, reflectionDirection, cameraDirection) => {
    const specularReflection = faceReflection;
    const cosine = Math.max(vec3.dot(reflectionDirection, cameraDirection), 0.0);
    const specularPower = Math.pow(cosine, specularExponent);

    vec3.mul(specularColorTemp, specularLightColorTemp, specularReflection);
    vec3.scale(
      specularColorTemp,
      specularColorTemp,
      specularLightIntensity * attenuation * specularPower
    );
  };

  // normal matrix
  mat4.invert(normalMatrixTemp, modelMatrix);
  mat4.transpose(normalMatrixTemp, normalMatrixTemp);

  // attenuation factors
  const attenuationFactorA = parseFloat(attenuationFactorInputA.value);
  const attenuationFactorB = parseFloat(attenuationFactorInputB.value);
  const attenuationFactorC = parseFloat(attenuationFactorInputC.value);

  // ambient light color
  vec3.set(
    ambientLightColorTemp,
    parseFloat(ambientLightInputR.value),
    parseFloat(ambientLightInputG.value),
    parseFloat(ambientLightInputB.value)
  );

  // diffuse light color and intensity
  const diffuseLightIntensity = parseFloat(diffuseIntensityInput.value);
  vec3.set(
    diffuseLightColorTemp,
    parseFloat(diffuseLightInputR.value),
    parseFloat(diffuseLightInputG.value),
    parseFloat(diffuseLightInputB.value)
  );

  // specular light color, intensity and exponent
  const specularLightIntensity = parseFloat(specularIntensityInput.value);
  const specularExponent = parseFloat(specularExponentInput.value);
  vec3.set(
    specularLightColorTemp,
    parseFloat(specularLightInputR.value),
    parseFloat(specularLightInputG.value),
    parseFloat(specularLightInputB.value)
  );

  // iterate every triangles
  for (let i = 0; i < vertices.length; i += 9) {
    const [x0, y0, z0] = vertices.slice(i + 0, i + 3);
    const [x1, y1, z1] = vertices.slice(i + 3, i + 6);
    const [x2, y2, z2] = vertices.slice(i + 6, i + 9);

    // position
    vec4.set(centroid4Temp, (x0 + x1 + x2) / 3, (y0 + y1 + y2) / 3, (z0 + z1 + z2) / 3, 1);
    // normalized position equals normal of a sphere
    vec4.copy(normal4Temp, centroid4Temp);
    vec4.transformMat4(centroid4Temp, centroid4Temp, modelMatrix);
    vec3.set(centroid3Temp, centroid4Temp[0], centroid4Temp[1], centroid4Temp[2]);

    // normal
    vec4.transformMat4(normal4Temp, normal4Temp, normalMatrixTemp);
    vec3.set(normal3Temp, normal4Temp[0], normal4Temp[1], normal4Temp[2]);
    vec3.normalize(normal3Temp, normal3Temp);

    // light direction
    vec3.subtract(lightDirectionTemp, lightPosition, centroid3Temp);
    vec3.normalize(lightDirectionTemp, lightDirectionTemp);

    // reflection direction
    vec3.scale(reflectionDirectionTemp, normal3Temp, 2 * vec3.dot(lightDirectionTemp, normal3Temp));
    vec3.subtract(reflectionDirectionTemp, reflectionDirectionTemp, lightDirectionTemp);
    vec3.normalize(reflectionDirectionTemp, reflectionDirectionTemp);

    // camera direction
    vec3.subtract(cameraDirectionTemp, cameraPosition, centroid3Temp);
    vec3.normalize(cameraDirectionTemp, cameraDirectionTemp);

    // attenuation
    const distance = vec3.distance(lightPosition, centroid3Temp);
    const attenuation =
      1 /
      (attenuationFactorA +
        attenuationFactorB * distance +
        attenuationFactorC * Math.pow(distance, 2));

    ambient();
    diffuse(attenuation, lightDirectionTemp, normal3Temp);
    specular(attenuation, reflectionDirectionTemp, cameraDirectionTemp);

    vec3.zero(colorTemp);
    vec3.add(colorTemp, colorTemp, ambientColorTemp);
    vec3.add(colorTemp, colorTemp, diffuseColorTemp);
    vec3.add(colorTemp, colorTemp, specularColorTemp);

    colors.set(colorTemp, i + 0);
    colors.set(colorTemp, i + 3);
    colors.set(colorTemp, i + 6);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.DYNAMIC_DRAW);
};

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);
gl.cullFace(gl.BACK);
const render = (time) => {
  updateLightPosition(time);
  flatShading();

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 3);

  requestAnimationFrame(render);
  lastAnimationTime = time;
};
render(0);

getCanvasResizeObserver(setMvpMatrix);
