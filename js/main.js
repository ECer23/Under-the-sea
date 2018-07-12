let camera, scene, renderer, composer;
let container, gui, controler, stats;
let lighthelper, axesHelper, gridHelper, shadowhelper;
let clock, raycaster, mouse, mousetargetpos;
let simplex = new SimplexNoise();

let gpuCompute;
let velocityVariable, positionVariable, positionUniforms, velocityUniforms;
let interactiveParticles, particlesGeometry, particleUniforms, particlesmaterial;

let Colors = {
  green: 0x8fc999,
  blue: 0x5fc4d0,
  orange: 0xee5624,
  yellow: 0xfaff70
};



function init() {
  threeInit();
  sceneInit();
  raycasterInit();
  PostprocessingInit();

  // horse 
  horseInit();

  // fireworks
  fireworksInit();

  // fish
  // fishSwim.fish
  // postprocessing();
  
  // under the sea
  underSeaInit();
  // bubbles
  bubblesInit();
  // cloth
  clothInit();
  // seaflower
  initSeaflower();
  // normal mapping
  initPointLight()
  initNormalMappingModel()

  // gui
  gui = new dat.GUI();
  guiThreeInit();
  guiSceneInit();
  guiPostprocessingInit();
  guiClothInit();
  guiFireworksInit();
  guiHorseInit();
  guiBubblesInit();
  guiSeaflowerInit();
  guiSeaInit();


  clock = new THREE.Clock();
  stats = new Stats();
  clock.start();
  document.body.appendChild(stats.dom);
  requestAnimationFrame(this.animation.bind(this));
  animation(this);
}

function animation(current) {
  //render the scene over the sea
  if (! guiSeaParams.underTheSea) {
      // raycaster
      raycaster.setFromCamera(mouse, camera);
      let targetDeepth = 100 + 50 * Math.sin(performance.now() * 0.001);
      fishSwim.target = raycaster.ray.at(targetDeepth, new THREE.Vector3());

      seaplaneAnimaiton();
      cloudAnimation();
      fishAnimation();
      horseAnimation();
      
    
      if(guiSceneParams.collisionDetect)
        collisionDetection();

      // fireworks
      fireworksAnimation();

      // composer.render();

      // render
      if (guiPostProcessParams.postProcess) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }

      let delta = clock.getDelta();
      if (guiThreeParams.fly) controler.update(delta);
    
    //render the sea under the sea
   } else {
      clothAnimation(current);
      bubblesAnimation();
      seaAnimaiton();
      seaflowerAnimation();
      normalMappingAnimation();

      stats.begin();
      stats.end();
      underComposer.render();
   }

  requestAnimationFrame(this.animation.bind(this));
  stats.update();
}

//////////////////////////
let guiThreeParams = {
  orbit: true,
  fly: false,
  helper: false
};

function guiThreeInit() {
  let guiThree = gui.addFolder("Three Setting");
  guiThree
    .add(guiThreeParams, "helper")
    .name("Show Helper")
    .onChange(function (value) {
      gridHelper.visible = value;
      lighthelper.visible = value;
      axesHelper.visible = value;
      shadowhelper.visible = value;
    });
  guiThree
    .add(guiThreeParams, "orbit")
    .name("Oribit Camera")
    .onChange(function (value) {
      if (value) {
          if (!guiSeaParams.underTheSea) {
            controler = new THREE.OrbitControls(camera, renderer.domElement);
          } else {
            controler = new THREE.OrbitControls(seaCamera, renderer.domElement);
          }
      } else {
        controler = null;
      }
    });
  guiThree
    .add(guiThreeParams, "fly")
    .name("Fly Camera")
    .onChange(function (value) {
      if (!guiSeaParams.underTheSea) {
          if (value && controler) {
            controler = new THREE.FlyControls(camera);
            controler.movementSpeed = 20;
            controler.domElement = container;
            controler.rollSpeed = Math.PI * 0.1;
            controler.autoForward = false;
            controler.dragToLook = false;
          } else {
            controler = null;
          }
      }
    });
}

function threeInit() {
  container = document.createElement("div");
  document.body.appendChild(container);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x93CFF3, 50, 300);

  //skybox
  var path = "../asset/textures/skybox/";       //set path
        var format = '.jpg';                        //set type
  var urls = [
       path + 'px2'+ format,     
       path + 'px2'+ format,
       path + 'py' + format,
       path + 'ny' + format,
       path + 'pz2' + format,
       path + 'pz2' + format
        ];
  var textureCube = new THREE.CubeTextureLoader().load( urls );

  scene.background = textureCube; //bg texture
  
  camera = new THREE.PerspectiveCamera(
    85,
    window.innerWidth / window.innerHeight,
    1,
    3000
  );
  camera.position.set(25, 20, 70);
  camera.lookAt(scene.position);

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x000000);
  
  stateBuffers = renderer.state.buffers;

  // light that case shadow
  //   scene.add(new THREE.AmbientLight(0x663344, 3.0));
  let shadowLight = new THREE.DirectionalLight(0xffffff, 1.0);
  shadowLight.castShadow = true;
  shadowLight.shadow.camera.left = -200;
  shadowLight.shadow.camera.right = 200;
  shadowLight.shadow.camera.top = 200;
  shadowLight.shadow.camera.bottom = -200;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 8192;
  shadowLight.shadow.mapSize.height = 8192;
  scene.add(shadowLight);
  shadowLight.position.set(-500, 160, -200);

  // sun light with lensflare
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
  directionalLight.position.set(-500, 160, -200);
  directionalLight.castShadow = true;
  var textureLoader = new THREE.TextureLoader();
  var textureFlare0 = textureLoader.load("../asset/textures/lensflare0.png");
  var textureFlare3 = textureLoader.load("../asset/textures/lensflare3.png");
  var lensflare = new THREE.Lensflare();
  lensflare.addElement(
    new THREE.LensflareElement(textureFlare0, 500, 0, directionalLight.color)
  );
  lensflare.addElement(new THREE.LensflareElement(textureFlare3, 60, 0.6));
  lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 0.7));
  lensflare.addElement(new THREE.LensflareElement(textureFlare3, 120, 0.9));
  lensflare.addElement(new THREE.LensflareElement(textureFlare3, 70, 1));
  directionalLight.add(lensflare);
  scene.add(directionalLight);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.2);
  directionalLight2.position.set(1, 2, 1);
  directionalLight2.castShadow = true;
  scene.add(directionalLight2);

  const ambientLight = new THREE.AmbientLight(0x808080, 0.5);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0xcefeff, 0xb3eaf0, 0.5);
  scene.add(hemisphereLight);

  // camera controler
  controler = new THREE.OrbitControls(camera, renderer.domElement);

  // helper
  lighthelper = new THREE.DirectionalLightHelper(shadowLight);
  lighthelper.visible = false;
  scene.add(lighthelper);

  shadowhelper = new THREE.CameraHelper(shadowLight.shadow.camera);
  shadowhelper.visible = false;
  scene.add(shadowhelper);

  axesHelper = new THREE.AxesHelper(100);
  axesHelper.visible = false;
  scene.add(axesHelper);

  gridHelper = new THREE.GridHelper(100, 10);
  gridHelper.visible = false;
  scene.add(gridHelper);
  
  window.addEventListener("resize", handleWindowResize, false);
}

function raycasterInit() {
  mouse = new THREE.Vector2();
  raycaster = new THREE.Raycaster();
  document.addEventListener("mousemove", onDocumentMouseMove, false);
}

function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  if (guiSeaParams.stencilTest) {
        var vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);

        vector.unproject(circleCamera);

        var dir = vector.sub(circleCamera.position).normalize();

        var distance = -circleCamera.position.z / dir.z;

        var pos = circleCamera.position.clone().add(dir.multiplyScalar(distance));
        circle.position.setX(pos.x*200);
        circle.position.setY(pos.y*200);
        circle.position.setZ(-5000)
  }
}

function postprocessing() {
  renderer.autoClear = false;

  let renderPass = new THREE.RenderPass(scene, camera);

  let effectFilm = new THREE.DotScreenPass(
    new THREE.Vector2(0.5, 0.5),
    0.3,
    0.5
  );
  effectFilm.goWild = true;

  effectFilm.renderToScreen = true;

  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(effectFilm);
}

init();

/////////////////

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
  
  seaCamera.aspect = WIDTH / HEIGHT;
  seaCamera.updateProjectionMatrix();
}

function collisionDetection() {
  let objects = scene.children;
  let island = {};
  let fishes = Array();
  for (let i = 0; i < objects.length; i++) {
    let obj = objects[i]
    if (obj.name == 'island') {
      island = obj.clone();
    } else if (obj.name == 'fish') {
      fishes.push(obj.children[0]);
    }
  }

  for (let i = 0; i < fishes.length; i++) {
    collisionDetectionForOneObject(fishes[i], island, i);
  }
}

function collisionDetectionForOneObject(mesh, island, index) {
  let fish = mesh.parent.clone();
  let originPoint = fish.position.clone();

  let speed = fishSwim.fish[index].speed.clone();

  let nowAcceleration = new THREE.Vector3()
    .copy(fishSwim.target)
    .sub(originPoint);
  nowAcceleration.clampLength(0.0, 0.05);
  speed.add(nowAcceleration);
  speed.clampLength(1.0, 3.0);
  speed.multiplyScalar(10);
  let next_pos = originPoint.clone().add(speed);

  let min = 99999;

  
  var material = new THREE.LineBasicMaterial({color:0x0000ff});  
  var geometry = new THREE.Geometry();  
  geometry.vertices.push(originPoint);
  geometry.vertices.push(next_pos);
  var line = new THREE.Line(geometry, material);
  scene.add(line);

  // var material = new THREE.LineBasicMaterial({color:0x00ffff});  
  // var geometry = new THREE.Geometry();
  // let new_vertex = island.geometry.vertices[200].clone().applyMatrix4(island.matrixWorld);
  // geometry.vertices.push(new_vertex);
  // geometry.vertices.push(next_pos);
  // var line = new THREE.Line(geometry, material);  
  // scene.add(line);

  for (let i = 0; i < island.geometry.vertices.length; i++) {
    let new_vertex = island.geometry.vertices[i].clone().applyMatrix4(island.matrixWorld);
    let temp = new_vertex.sub(next_pos).length();
    if (temp < min) {
      min = temp;
    }
  }

  console.log(min)
  
  if (min < 20) {
    mesh.parent.collision = 1;
    console.log(mesh.parent.collision)
  } else {
    mesh.parent.collision = 0;
  }

}

