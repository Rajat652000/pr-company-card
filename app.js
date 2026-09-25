import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const host = document.getElementById("viewer");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;

host.appendChild(renderer.domElement);

/* =========================
   LIGHTS
   ========================= */

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
warm.position.set(2, 1, 2);
scene.add(warm);

/* =========================
   CONTROLS
   ========================= */

const controls = new OrbitControls(
  camera,
  renderer.domElement
);

controls.enableDamping = true;
controls.dampingFactor = 0.06;

controls.enablePan = false;

controls.minPolarAngle = Math.PI * 0.30;
controls.maxPolarAngle = Math.PI * 0.70;

/*
 * Prevent OrbitControls from rotating the
 * camera sideways initially.
 */
controls.target.set(0, 1.25, 0);

/* =========================
   MODEL
   ========================= */

let mixer = null;
let model = null;

const MODEL_HEIGHT = 2.65;

const loader = new GLTFLoader();

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

    /* -------------------------
       NORMALIZE MODEL
       ------------------------- */

    const originalBox =
      new THREE.Box3().setFromObject(model);

    const originalSize =
      new THREE.Vector3();

    originalBox.getSize(originalSize);

    /*
     * Normalize every GLB to the same
     * physical height.
     */
    const scale =
      MODEL_HEIGHT / originalSize.y;

    model.scale.setScalar(scale);

    /*
     * Recalculate AFTER scaling.
     */
    model.updateMatrixWorld(true);

    const box =
      new THREE.Box3().setFromObject(model);

    const center =
      new THREE.Vector3();

    box.getCenter(center);

    /*
     * Center X/Z.
     *
     * Put character's feet at Y = 0.
     */
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    model.updateMatrixWorld(true);

    /* -------------------------
       ANIMATION
       ------------------------- */

    if (gltf.animations.length) {

      mixer =
        new THREE.AnimationMixer(model);

      const action =
        mixer.clipAction(
          gltf.animations[0]
        );

      action.reset();
      action.play();

      console.log(
        "Animations:",
        gltf.animations.map(
          animation => animation.name
        )
      );

    }

    /*
     * IMPORTANT:
     * Fit camera only AFTER the model
     * has been centered/scaled.
     */

    fitCameraToModel();

    console.log(
      "3D model loaded successfully."
    );

  },

  (xhr) => {

    if (xhr.total) {

      const percent =
        Math.round(
          (xhr.loaded / xhr.total) * 100
        );

      console.log(
        `Loading model: ${percent}%`
      );

    }

  },

  (error) => {

    console.error(
      "Failed to load 3D model:",
      error
    );

    host.insertAdjacentHTML(
      "beforeend",
      `
      <div style="
        position:absolute;
        inset:45% 10% auto;
        text-align:center;
        color:#ffb74d;
        z-index:9;
      ">
        Unable to load 3D model
      </div>
      `
    );

  }
);

/* =========================
   RESPONSIVE CAMERA
   ========================= */

function fitCameraToModel() {

  if (!model) return;

  model.updateMatrixWorld(true);

  const box =
    new THREE.Box3().setFromObject(model);

  const size =
    new THREE.Vector3();

  const center =
    new THREE.Vector3();

  box.getSize(size);
  box.getCenter(center);

  const width =
    Math.max(host.clientWidth, 1);

  const height =
    Math.max(host.clientHeight, 1);

  const aspect =
    width / height;

  /*
   * Vertical FOV.
   */
  const verticalFov =
    THREE.MathUtils.degToRad(
      camera.fov
    );

  /*
   * Horizontal FOV depends on aspect.
   */
  const horizontalFov =
    2 * Math.atan(
      Math.tan(verticalFov / 2) *
      aspect
    );

  /*
   * Distance needed to fit model
   * vertically.
   */
  const distanceForHeight =
    (size.y / 2) /
    Math.tan(verticalFov / 2);

  /*
   * Distance needed to fit model
   * horizontally.
   *
   * THIS fixes narrow phones.
   */
  const distanceForWidth =
    (size.x / 2) /
    Math.tan(horizontalFov / 2);

  let distance =
    Math.max(
      distanceForHeight,
      distanceForWidth
    );

  /*
   * Leave room for floating chips.
   *
   * Narrow phone needs more margin.
   */
  const isPhone =
    width <= 480;

  if (isPhone) {

    distance *= 1.42;

  } else {

    distance *= 1.22;

  }

  /*
   * Look approximately at chest/waist
   * instead of feet or top of head.
   */
  const targetY =
    box.min.y +
    size.y * 0.48;

  controls.target.set(
    center.x,
    targetY,
    center.z
  );

  /*
   * Keep camera exactly centered.
   */
  camera.position.set(
    center.x,
    targetY + size.y * 0.03,
    center.z + distance
  );

  /*
   * Allow zoom relative to calculated
   * model size instead of hardcoded
   * 2.7 / 6.
   */
  controls.minDistance =
    distance * 0.72;

  controls.maxDistance =
    distance * 1.8;

  camera.near =
    Math.max(
      distance / 100,
      0.01
    );

  camera.far =
    distance * 20;

  camera.updateProjectionMatrix();

  controls.update();

}

/* =========================
   RESIZE
   ========================= */

function resize() {

  const width =
    Math.max(host.clientWidth, 1);

  const height =
    Math.max(host.clientHeight, 1);

  renderer.setSize(
    width,
    height,
    false
  );

  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();

  /*
   * Re-frame character whenever phone
   * orientation / viewport changes.
   */
  if (model) {

    fitCameraToModel();

  }

}

const resizeObserver =
  new ResizeObserver(resize);

resizeObserver.observe(host);

window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(resize, 150);

  }
);

resize();

/* =========================
   RENDER LOOP
   ========================= */

const clock =
  new THREE.Clock();

function loop() {

  requestAnimationFrame(loop);

  const delta =
    clock.getDelta();

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