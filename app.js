import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const host = document.getElementById("viewer");

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  35,
  1,
  0.01,
  100
);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.outputColorSpace =
  THREE.SRGBColorSpace;

renderer.toneMapping =
  THREE.ACESFilmicToneMapping;

renderer.toneMappingExposure = 1.15;

host.appendChild(renderer.domElement);


/* ==============================
   LIGHTS
   ============================== */

scene.add(
  new THREE.HemisphereLight(
    0xb9d8ff,
    0x16100a,
    2.5
  )
);

const key =
  new THREE.DirectionalLight(
    0xffffff,
    3.2
  );

key.position.set(3, 5, 4);
scene.add(key);


const rim =
  new THREE.DirectionalLight(
    0x2d8cff,
    3
  );

rim.position.set(-4, 3, -3);
scene.add(rim);


const warm =
  new THREE.PointLight(
    0xffad32,
    18,
    8
  );

warm.position.set(2, 1, 2);
scene.add(warm);


/* ==============================
   MODEL CONTAINER
   ============================== */

const modelRoot =
  new THREE.Group();

scene.add(modelRoot);


let model = null;
let mixer = null;

const loader =
  new GLTFLoader();

loader.setMeshoptDecoder(
  MeshoptDecoder
);


/* ==============================
   LOAD MODEL
   ============================== */

loader.load(

  "./models/pr-boy.glb",

  (gltf) => {

    model = gltf.scene;

    modelRoot.add(model);


    /* --------------------------
       ORIGINAL SIZE
       -------------------------- */

    model.updateMatrixWorld(true);

    let box =
      new THREE.Box3()
        .setFromObject(model);

    const originalSize =
      new THREE.Vector3();

    box.getSize(originalSize);


    /* --------------------------
       NORMALIZE
       -------------------------- */

    const targetHeight = 2.2;

    const scale =
      targetHeight /
      originalSize.y;

    model.scale.setScalar(scale);

    model.updateMatrixWorld(true);


    /* --------------------------
       CENTER MODEL
       -------------------------- */

    box =
      new THREE.Box3()
        .setFromObject(model);

    const center =
      new THREE.Vector3();

    box.getCenter(center);


    /*
     * Model itself gets centered
     * inside modelRoot.
     */

    model.position.x -= center.x;
    model.position.y -= center.y;
    model.position.z -= center.z;

    model.updateMatrixWorld(true);


    /* --------------------------
       ANIMATION
       -------------------------- */

    if (gltf.animations.length) {

      mixer =
        new THREE.AnimationMixer(model);

      mixer
        .clipAction(
          gltf.animations[0]
        )
        .play();

    }


    /*
     * Fit AFTER centering.
     */

    fitModel();

  },

  undefined,

  (error) => {

    console.error(
      "GLB error:",
      error
    );

  }

);


/* ==============================
   CAMERA FIT
   ============================== */

function fitModel() {

  if (!model)
    return;


  const width =
    host.clientWidth;

  const height =
    host.clientHeight;


  if (!width || !height)
    return;


  camera.aspect =
    width / height;


  const isMobile =
    width <= 600;

  const isSmallMobile =
    width <= 380;


  camera.fov = isSmallMobile ? 43 : isMobile ? 40 : 32;


  camera.updateProjectionMatrix();


  /*
   * Model is now centered around
   * (0,0,0).
   */

  modelRoot.updateMatrixWorld(true);

  const box =
    new THREE.Box3()
      .setFromObject(modelRoot);

  const size =
    new THREE.Vector3();

  box.getSize(size);


  const vFov =
    THREE.MathUtils.degToRad(
      camera.fov
    );


  const hFov =
    2 * Math.atan(
      Math.tan(vFov / 2) *
      camera.aspect
    );


  const fitHeight =
    (size.y / 2) /
    Math.tan(vFov / 2);


  const fitWidth =
    (size.x / 2) /
    Math.tan(hFov / 2);


  let distance =
    Math.max(
      fitHeight,
      fitWidth
    );


  /*
   * IMPORTANT:
   * Extra margin on mobile.
   */

  // Phone screens are tall and narrow; add enough breathing room so the
  // character remains fully visible instead of being cropped on the right.
  distance *= isSmallMobile ? 3.15 : isMobile ? 2.85 : 1.25;


  /*
   * CAMERA ALWAYS CENTERED.
   */

  camera.position.set(
    0,
    0,
    distance
  );

  // Keep the character visually centered on narrow phone screens.
  if (isMobile) {
    modelRoot.position.x = 0;
    modelRoot.position.y = 0;
  }


  const target = new THREE.Vector3();
  box.getCenter(target);

  // The character's visible body is offset to the right inside the GLB
  // bounds, so aim slightly right on phones to center it visually.
  if (isMobile) {
    target.x += isSmallMobile ? 1.45 : 1.35;
    target.y -= isSmallMobile ? 1.45 : 1.35;
  }

  camera.position.x = target.x;
  camera.position.y = target.y;
  camera.position.z = target.z + distance;

  camera.lookAt(target.x, target.y, target.z);


  camera.updateProjectionMatrix();

}


/* ==============================
   MANUAL ROTATION
   ============================== */

let dragging = false;

let previousX = 0;

let velocity = 0;


/*
 * Mouse / finger down
 */

renderer.domElement.addEventListener(
  "pointerdown",
  (event) => {

    dragging = true;

    previousX =
      event.clientX;

    renderer.domElement
      .setPointerCapture(
        event.pointerId
      );

  }
);


/*
 * Drag
 */

renderer.domElement.addEventListener(
  "pointermove",
  (event) => {

    if (!dragging)
      return;


    const delta =
      event.clientX -
      previousX;


    previousX =
      event.clientX;


    velocity =
      delta * 0.008;


    modelRoot.rotation.y +=
      velocity;

  }
);


/*
 * Stop drag
 */

function stopDragging() {

  dragging = false;

}


renderer.domElement.addEventListener(
  "pointerup",
  stopDragging
);


renderer.domElement.addEventListener(
  "pointercancel",
  stopDragging
);


/* ==============================
   ZOOM
   ============================== */

let zoom = 1;


/*
 * Desktop mouse wheel.
 */

renderer.domElement.addEventListener(
  "wheel",
  (event) => {

    event.preventDefault();


    zoom +=
      event.deltaY * 0.001;


    zoom =
      THREE.MathUtils.clamp(
        zoom,
        0.75,
        1.6
      );


    modelRoot.scale.setScalar(
      1 / zoom
    );

  },
  {
    passive: false
  }
);


/* ==============================
   RESIZE
   ============================== */

function resize() {

  const width =
    host.clientWidth;

  const height =
    host.clientHeight;


  if (!width || !height)
    return;


  renderer.setSize(
    width,
    height,
    false
  );


  camera.aspect =
    width / height;


  camera.updateProjectionMatrix();


  if (model)
    fitModel();

}


new ResizeObserver(
  resize
).observe(host);


window.addEventListener(
  "orientationchange",
  () => {

    setTimeout(
      resize,
      200
    );

  }
);


resize();


/* ==============================
   RENDER LOOP
   ============================== */

const clock =
  new THREE.Clock();


function animate() {

  requestAnimationFrame(
    animate
  );


  const delta =
    clock.getDelta();


  if (mixer)
    mixer.update(delta);


  /*
   * Small inertia after dragging.
   */

  if (!dragging) {

    velocity *= 0.93;


    if (
      Math.abs(velocity) >
      0.0001
    ) {

      modelRoot.rotation.y +=
        velocity;

    }

  }


  renderer.render(
    scene,
    camera
  );

}


animate();
