import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const host = document.getElementById("viewer");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
camera.position.set(0, 1.35, 4.6);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;

host.appendChild(renderer.domElement);

/* Lights */

scene.add(
  new THREE.HemisphereLight(
    0xb9d8ff,
    0x16100a,
    2.5
  )
);

const key = new THREE.DirectionalLight(0xffffff, 3.2);
key.position.set(3, 5, 4);
scene.add(key);

const rim = new THREE.DirectionalLight(0x2d8cff, 3);
rim.position.set(-4, 3, -3);
scene.add(rim);

const warm = new THREE.PointLight(0xffad32, 18, 8);
warm.position.set(2, 0.5, 2);
scene.add(warm);

/* Controls */

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.enablePan = false;

controls.minDistance = 2.7;
controls.maxDistance = 6;

controls.target.set(0, 1.15, 0);

controls.minPolarAngle = Math.PI * 0.28;
controls.maxPolarAngle = Math.PI * 0.72;

/* GLB Loader */

let mixer = null;
let model = null;

const loader = new GLTFLoader();

/*
 * Required for GLB files optimized
 * using Meshopt compression.
 */
loader.setMeshoptDecoder(MeshoptDecoder);

loader.load(
  "./models/pr-boy.glb",

  (gltf) => {
    model = gltf.scene;

    scene.add(model);

    model.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(model);

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    model.position.sub(center);
    model.position.y += size.y / 2;

    const scale = 2.65 / size.y;
    model.scale.setScalar(scale);

    /* Play first animation if available */

    if (gltf.animations.length) {
      mixer = new THREE.AnimationMixer(model);

      mixer
        .clipAction(gltf.animations[0])
        .play();

      console.log(
        "Animations:",
        gltf.animations.map((animation) => animation.name)
      );
    }

    console.log("3D model loaded successfully.");
  },

  /* Loading progress */

  (xhr) => {
    if (xhr.total) {
      const percent = Math.round(
        (xhr.loaded / xhr.total) * 100
      );

      console.log(`Loading model: ${percent}%`);
    }
  },

  /* Error */

  (error) => {
    console.error("Failed to load 3D model:", error);

    host.insertAdjacentHTML(
      "beforeend",
      `
      <div
        style="
          position:absolute;
          inset:45% 10% auto;
          text-align:center;
          color:#ffb74d;
          z-index:9;
        "
      >
        Unable to load 3D model
      </div>
      `
    );
  }
);

/* Resize */

const clock = new THREE.Clock();

function resize() {
  const width = host.clientWidth;
  const height = host.clientHeight;

  renderer.setSize(
    width,
    height,
    false
  );

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

new ResizeObserver(resize).observe(host);

resize();

/* Render Loop */

function loop() {
  requestAnimationFrame(loop);

  const delta = clock.getDelta();

  if (mixer) {
    mixer.update(delta);
  }

  controls.update();

  renderer.render(
    scene,
    camera
  );
}

loop();