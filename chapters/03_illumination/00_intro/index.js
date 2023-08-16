import { vec3 } from "gl-matrix";
import { Scene } from "../../libs/Scene";
import { getCanvas } from "../../libs/common";
import { BlenderCamera } from "../../libs/control/BlenderCamera";
import { IndexedCube } from "../../libs/geom/Cube";
import { PerVertexColorMaterial } from "../../libs/material/PerVertexColorMaterial";

const scene = new Scene(getCanvas());
scene.addControl(
  new BlenderCamera({
    position: vec3.fromValues(2, 2, 2),
  })
);

const cube = new IndexedCube(2);
// prettier-ignore
cube.material = new PerVertexColorMaterial(new Float32Array([
  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  0.4,0.4,1.0,  // front(blue)
  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  1.0,0.4,0.4,  // up(red)
  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  0.4,1.0,1.0,  // back(cyan)
  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  1.0,1.0,1.0,  // bottom(white)
  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  1.0,1.0,0.4,  // left(yellow)
  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  0.4,1.0,0.4,  // right(green)
]));
scene.root.addChild(cube);

scene.renderFrame();
