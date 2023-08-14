import { glMatrix, vec3 } from "gl-matrix";
import { Scene } from "../../libs/Scene";
import { PerspectiveCamera } from "../../libs/camera/Perspective";
import { getCanvas } from "../../libs/common";
import { Sphere } from "../../libs/geom/Sphere";

const canvas = getCanvas();

const camera = new PerspectiveCamera(
  glMatrix.toRadian(60),
  canvas.width / canvas.height,
  1,
  1000,
  vec3.fromValues(0, 0, 3),
  vec3.fromValues(0, 0, 0),
  vec3.fromValues(0, 1, 0)
);

const scene = new Scene(getCanvas(), {
  camera,
});

const sphere = new Sphere(1, 24);
scene.root.addChild(sphere);

scene.renderFrame();
