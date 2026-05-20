// ============================================================
// Assignment 4 – Phong Lighting
// Built on top of Assignment 3 (Virtual World / First-Person)
// ============================================================

// ──────────────────────────────────────────────────────────────
// SHADERS
// ──────────────────────────────────────────────────────────────
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'attribute vec3 a_Normal;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_NormalMatrix;\n' +
  'uniform float u_TexScale;\n' +
  'varying vec2 v_TexCoord;\n' +
  'varying vec3 v_Normal;\n' +
  'varying vec3 v_FragPos;\n' +
  'void main() {\n' +
  '  vec4 worldPos = u_ModelMatrix * a_Position;\n' +
  '  gl_Position   = u_ProjMatrix * u_ViewMatrix * worldPos;\n' +
  '  v_TexCoord    = a_TexCoord * u_TexScale;\n' +
  '  v_FragPos     = worldPos.xyz;\n' +
  '  v_Normal      = normalize((u_NormalMatrix * vec4(a_Normal, 0.0)).xyz);\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec2  v_TexCoord;\n' +
  'varying vec3  v_Normal;\n' +
  'varying vec3  v_FragPos;\n' +
  'uniform vec4      u_Color;\n' +
  'uniform sampler2D u_Sampler;\n' +
  'uniform int       u_UseTexture;\n' +
  'uniform int       u_Lighting;\n' +
  'uniform int       u_ShowNormals;\n' +
  'uniform int       u_PointLightOn;\n' +
  'uniform int       u_SpotLightOn;\n' +
  'uniform vec3      u_CameraPos;\n' +
  'uniform vec3      u_LightPos;\n' +
  'uniform vec3      u_LightColor;\n' +
  'uniform vec3      u_SpotPos;\n' +
  'uniform vec3      u_SpotDir;\n' +
  'uniform float     u_SpotCutoff;\n' +
  'uniform vec3      u_SpotColor;\n' +
  'vec3 phong(vec3 N, vec3 L, vec3 V, vec3 lc, vec3 dc) {\n' +
  '  float kA = 0.2; float kD = 0.8; float kS = 0.6; float sh = 32.0;\n' +
  '  vec3 ambient  = kA * lc * dc;\n' +
  '  float diff    = max(dot(N, L), 0.0);\n' +
  '  vec3 diffuse  = kD * diff * lc * dc;\n' +
  '  vec3 R        = reflect(-L, N);\n' +
  '  float spec    = pow(max(dot(R, V), 0.0), sh);\n' +
  '  vec3 specular = kS * spec * lc;\n' +
  '  return ambient + diffuse + specular;\n' +
  '}\n' +
  'void main() {\n' +
  '  vec4 baseColor;\n' +
  '  if (u_UseTexture == 1) { baseColor = texture2D(u_Sampler, v_TexCoord); }\n' +
  '  else                   { baseColor = u_Color; }\n' +
  '  if (u_ShowNormals == 1) {\n' +
  '    gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);\n' +
  '    return;\n' +
  '  }\n' +
  '  if (u_Lighting == 0) { gl_FragColor = baseColor; return; }\n' +
  '  vec3 N = normalize(v_Normal);\n' +
  '  vec3 V = normalize(u_CameraPos - v_FragPos);\n' +
  '  vec3 result = vec3(0.0);\n' +
  '  if (u_PointLightOn == 1) {\n' +
  '    vec3 L = normalize(u_LightPos - v_FragPos);\n' +
  '    result += phong(N, L, V, u_LightColor, baseColor.rgb);\n' +
  '  } else {\n' +
  '    result += 0.2 * baseColor.rgb;\n' +
  '  }\n' +
  '  if (u_SpotLightOn == 1) {\n' +
  '    vec3 L     = normalize(u_SpotPos - v_FragPos);\n' +
  '    float cosA = dot(-L, normalize(u_SpotDir));\n' +
  '    if (cosA > u_SpotCutoff) {\n' +
  '      result += phong(N, L, V, u_SpotColor, baseColor.rgb);\n' +
  '    } else {\n' +
  '      result += 0.05 * u_SpotColor * baseColor.rgb;\n' +
  '    }\n' +
  '  }\n' +
  '  gl_FragColor = vec4(result, baseColor.a);\n' +
  '}\n';

// ──────────────────────────────────────────────────────────────
// GLOBALS
// ──────────────────────────────────────────────────────────────
var gl, g_canvas;
var camera;

var g_keys = {};
var g_pointerLocked = false;

var g_lastTime   = performance.now();
var g_frameCount = 0;

// Textures
var g_texture      = null, g_u_Sampler = null, g_textureReady  = false;
var g_sandTexture  = null, g_sandTextureReady  = false;
var g_grassTexture = null, g_grassTextureReady = false;

// Dragon OBJ model
var g_dragon = null;

// Zombie — screen-RIGHT from diagonal camera (lower X, higher Z than sphere)
var g_zombieX = 24.5, g_zombieZ = 29.5, g_zombieY = 0.0;
var g_zombieAngle = 45, g_zombieArmAngle = 0, g_zombieLegAngle = 0;

// Clouds
var g_clouds = [];
var CLOUD_Y  = 12.0;

// Lighting state
var g_lightingOn   = true;
var g_showNormals  = false;
var g_pointLightOn = true;
var g_spotLightOn  = false;

var g_lightPos   = [16.0, 8.0, 16.0];
var g_lightColor = [1.0,  1.0,  1.0];
var g_spotColor  = [1.0, 0.95, 0.8];
var SPOT_CUTOFF  = Math.cos(Math.PI / 12);

// Uniform locations
var u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_NormalMatrix;
var u_Color, u_UseTexture, u_Sampler;
var u_Lighting, u_ShowNormals, u_PointLightOn, u_SpotLightOn;
var u_CameraPos, u_LightPos, u_LightColor;
var u_SpotPos, u_SpotDir, u_SpotCutoff, u_SpotColor;
var u_TexScale;

// Map
var WORLD_SIZE = 32;
var MAX_HEIGHT  = 8;
var g_map       = [];

// ──────────────────────────────────────────────────────────────
// MAP
// ──────────────────────────────────────────────────────────────
function randBlock() { return Math.random() < 0.3 ? 2 : 1; }

function setCol(r, c, height) {
  for (var y = 0; y < height; y++) g_map[r][c][y] = randBlock();
}

function getHeight(r, c) {
  var h = 0;
  for (var y = 0; y < MAX_HEIGHT; y++) if (g_map[r][c][y] !== 0) h = y + 1;
  return h;
}

function buildMap() {
  for (var r = 0; r < WORLD_SIZE; r++) {
    g_map[r] = [];
    for (var c = 0; c < WORLD_SIZE; c++) {
      g_map[r][c] = [];
      for (var y = 0; y < MAX_HEIGHT; y++) g_map[r][c][y] = 0;
    }
  }
  for (var i = 0; i < WORLD_SIZE; i++) {
    setCol(0,i,2); setCol(WORLD_SIZE-1,i,2);
    setCol(i,0,2); setCol(i,WORLD_SIZE-1,2);
  }
  for (var i = 2; i < 14; i++) { setCol(i,10,2); setCol(i,22,2); }
  for (var i = 2; i < 9;  i++) setCol(14,i,2);
  for (var i = 23; i < 30; i++) setCol(14,i,2);
  setCol(8,16,2); setCol(5,13,1); setCol(5,19,1);
  setCol(20,8,2); setCol(20,24,2); setCol(24,16,2);
  setCol(12,6,1); setCol(12,26,1);
}

function buildClouds() {
  g_clouds = [
    {x:  8, z:  6, w: 5, d: 2, speed: 0.4},
    {x: 18, z: 10, w: 7, d: 2, speed: 0.3},
    {x:  4, z: 18, w: 4, d: 2, speed: 0.5},
    {x: 22, z: 14, w: 6, d: 3, speed: 0.35},
    {x: 12, z: 24, w: 5, d: 2, speed: 0.45},
    {x: 26, z:  4, w: 8, d: 2, speed: 0.25},
    {x:  2, z: 28, w: 6, d: 2, speed: 0.55},
    {x: 20, z: 26, w: 4, d: 3, speed: 0.3 }
  ];
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────
function main() {
  g_canvas = document.getElementById('webgl');
  gl = getWebGLContext(g_canvas);
  if (!gl) { console.log('WebGL context failed'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.47, 0.65, 1.0, 1.0);

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Shader init failed'); return;
  }

  u_ModelMatrix  = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix   = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix   = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
  u_Color        = gl.getUniformLocation(gl.program, 'u_Color');
  u_UseTexture   = gl.getUniformLocation(gl.program, 'u_UseTexture');
  u_Sampler      = gl.getUniformLocation(gl.program, 'u_Sampler');

  u_Lighting     = gl.getUniformLocation(gl.program, 'u_Lighting');
  u_ShowNormals  = gl.getUniformLocation(gl.program, 'u_ShowNormals');
  u_PointLightOn = gl.getUniformLocation(gl.program, 'u_PointLightOn');
  u_SpotLightOn  = gl.getUniformLocation(gl.program, 'u_SpotLightOn');

  u_CameraPos    = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_LightPos     = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor   = gl.getUniformLocation(gl.program, 'u_LightColor');
  u_SpotPos      = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir      = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff   = gl.getUniformLocation(gl.program, 'u_SpotCutoff');
  u_SpotColor    = gl.getUniformLocation(gl.program, 'u_SpotColor');
  u_TexScale     = gl.getUniformLocation(gl.program, 'u_TexScale');
  gl.uniform1f(u_TexScale, 1.0); // default: no tiling

  camera = new Camera(g_canvas);
  camera.eye.elements[0] = 22.0;
  camera.eye.elements[1] =  2.8;
  camera.eye.elements[2] = 22.0;
  camera.at.elements[0]  = 27.0;
  camera.at.elements[1]  =  1.5;
  camera.at.elements[2]  = 27.0;
  camera.up.elements[0]  =  0.0;
  camera.up.elements[1]  =  1.0;
  camera.up.elements[2]  =  0.0;
  if (typeof camera.updateViewMatrix === 'function') camera.updateViewMatrix();

  // Load dragon OBJ model
  g_dragon = new Model(gl, gl.program);
  g_dragon.load('dragon.obj', function() {
    console.log('Dragon ready, vertices: ' + g_dragon.numVertices);
  });

  initTextures();
  initSandTexture();
  initGrassTexture();
  buildMap();
  buildClouds();
  setupInput();
  tick();
}

// ──────────────────────────────────────────────────────────────
// UI TOGGLES
// ──────────────────────────────────────────────────────────────
function toggleLighting() {
  g_lightingOn = !g_lightingOn;
  var btn = document.getElementById('btnLighting');
  btn.textContent = g_lightingOn ? 'Lighting ON' : 'Lighting OFF';
  btn.className   = g_lightingOn ? 'active' : '';
}
function toggleNormals() {
  g_showNormals = !g_showNormals;
  var btn = document.getElementById('btnNormals');
  btn.textContent = g_showNormals ? 'Normals ON' : 'Normals OFF';
  btn.className   = g_showNormals ? 'active' : '';
}
function togglePointLight() {
  g_pointLightOn = !g_pointLightOn;
  var btn = document.getElementById('btnPointLight');
  btn.textContent = g_pointLightOn ? 'Point Light ON' : 'Point Light OFF';
  btn.className   = g_pointLightOn ? 'active' : '';
}
function toggleSpotLight() {
  g_spotLightOn = !g_spotLightOn;
  var btn = document.getElementById('btnSpotLight');
  btn.textContent = g_spotLightOn ? 'Spot Light ON' : 'Spot Light OFF';
  btn.className   = g_spotLightOn ? 'active' : '';
}
function updateLightColor(hex) {
  var r = parseInt(hex.slice(1,3),16)/255;
  var g2= parseInt(hex.slice(3,5),16)/255;
  var b = parseInt(hex.slice(5,7),16)/255;
  g_lightColor = [r, g2, b];
}

// ──────────────────────────────────────────────────────────────
// TEXTURES
// ──────────────────────────────────────────────────────────────
function initTextures() {
  var texture = gl.createTexture();
  if (!texture) return false;
  var u_SamplerLoc = gl.getUniformLocation(gl.program, 'u_Sampler');
  var image = new Image();
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.uniform1i(u_SamplerLoc, 0);
    g_texture = texture; g_u_Sampler = u_SamplerLoc; g_textureReady = true;
    console.log('Dirt texture loaded');
  };
  image.src = 'pack_3530346.jpg.webp';
  return true;
}

function initSandTexture() {
  var texture = gl.createTexture();
  if (!texture) return false;
  var image = new Image();
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    g_sandTexture = texture; g_sandTextureReady = true;
    console.log('Sand texture loaded');
  };
  image.src = 'sand.png';
  return true;
}

function initGrassTexture() {
  var texture = gl.createTexture();
  if (!texture) return false;
  var image = new Image();
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    g_grassTexture = texture; g_grassTextureReady = true;
    console.log('Grass texture loaded');
  };
  image.src = 'grass.jpg';
  return true;
}

// ──────────────────────────────────────────────────────────────
// INPUT
// ──────────────────────────────────────────────────────────────
function setupInput() {
  g_canvas.addEventListener('click', function() { g_canvas.requestPointerLock(); });
  document.addEventListener('pointerlockchange', function() {
    g_pointerLocked = (document.pointerLockElement === g_canvas);
  });
  document.addEventListener('mousemove', function(e) {
    if (!g_pointerLocked) return;
    if (e.movementX > 0) camera.panRight(e.movementX * 0.25);
    if (e.movementX < 0) camera.panLeft(-e.movementX * 0.25);
    if (e.movementY !== 0) camera.tiltVertical(e.movementY * 0.25);
  });
  document.addEventListener('keydown', function(e) { g_keys[e.key.toLowerCase()] = true; });
  document.addEventListener('keyup',   function(e) { g_keys[e.key.toLowerCase()] = false; });
  document.addEventListener('keydown', function(e) {
    var key = e.key.toLowerCase();
    if (key === 'q') camera.panLeft(5);
    if (key === 'e') camera.panRight(5);
    if (key === 'f') addBlock();
    if (key === 'r') deleteBlock();
  });
}

// ──────────────────────────────────────────────────────────────
// GAME LOOP
// ──────────────────────────────────────────────────────────────
function tick() {
  var now = performance.now();
  var dt  = (now - g_lastTime) / 1000;
  g_lastTime = now;

  g_frameCount++;
  if (g_frameCount % 30 === 0) {
    document.getElementById('fpsDisplay').textContent = Math.round(1/dt);
  }

  updateMovement(dt);
  updateZombie(dt);
  updateClouds(dt);

  // Animate point light — arcs vertically like a sun over the scene.
  // X drifts slowly across the world; Y swings high (4 → 22) and back;
  // Z stays near the back-right corner so it always lights the sphere/zombie well.
  var t = now / 1000;
  g_lightPos[0] = 16 + 12 * Math.cos(t * 0.3);   // slow east-west drift
  g_lightPos[1] =  8 + 10 * Math.abs(Math.sin(t * 0.3)); // 8..18, always above ground
  g_lightPos[2] = 16 + 12 * Math.sin(t * 0.3);   // north-south drift
  var sx = document.getElementById('sliderLightX');
  var sy = document.getElementById('sliderLightY');
  var sz = document.getElementById('sliderLightZ');
  if (sx) sx.value = g_lightPos[0].toFixed(1);
  if (sy) sy.value = g_lightPos[1].toFixed(1);
  if (sz) sz.value = g_lightPos[2].toFixed(1);

  renderScene();
  requestAnimationFrame(tick);
}

var SPEED     = 5.0;
var CAM_MIN_Y = 0.5;

function updateMovement(dt) {
  var speed = SPEED * dt;
  if (g_keys['w']) camera.moveForward(speed);
  if (g_keys['s']) camera.moveBackwards(speed);
  if (g_keys['a']) camera.moveLeft(speed);
  if (g_keys['d']) camera.moveRight(speed);

  if (camera.eye.elements[1] < CAM_MIN_Y) {
    var diff = CAM_MIN_Y - camera.eye.elements[1];
    camera.eye.elements[1] = CAM_MIN_Y;
    camera.at.elements[1] += diff;
    // safe call — not all camera.js versions have updateViewMatrix
    if (typeof camera.updateViewMatrix === 'function') camera.updateViewMatrix();
  }
  var e = camera.eye.elements;
  document.getElementById('posDisplay').textContent =
    e[0].toFixed(1)+', '+e[1].toFixed(1)+', '+e[2].toFixed(1);
}

function getTargetCell() {
  var eye = camera.eye.elements, at = camera.at.elements;
  var dx = at[0]-eye[0], dz = at[2]-eye[2];
  var len = Math.sqrt(dx*dx+dz*dz);
  if (len < 0.0001) return null;
  dx /= len; dz /= len;
  var tx = Math.floor(eye[0]+dx*1.8), tz = Math.floor(eye[2]+dz*1.8);
  if (tx<0||tx>=WORLD_SIZE||tz<0||tz>=WORLD_SIZE) return null;
  return {r:tz, c:tx};
}
function addBlock()    { var c=getTargetCell(); if(!c) return; var h=getHeight(c.r,c.c); if(h<MAX_HEIGHT) g_map[c.r][c.c][h]=1; }
function deleteBlock() { var c=getTargetCell(); if(!c) return; var h=getHeight(c.r,c.c); if(h>0) g_map[c.r][c.c][h-1]=0; }

// ──────────────────────────────────────────────────────────────
// ZOMBIE
// ──────────────────────────────────────────────────────────────
function updateZombie(dt) {
  // Zombie stands still next to the red sphere — just idle arm sway
  g_zombieArmAngle = 15 * Math.sin(performance.now() / 600);
}

function drawZombie() {
  var x=g_zombieX, z=g_zombieZ, y=g_zombieY;
  function part(tx,ty,tz,sx,sy,sz,color,extraRot,axis) {
    var M = new Matrix4();
    M.setTranslate(x,y,z); M.rotate(g_zombieAngle,0,1,0);
    M.translate(tx,ty,tz);
    if (extraRot !== undefined) M.rotate(extraRot,axis[0],axis[1],axis[2]);
    M.scale(sx,sy,sz);
    drawCube(M,color);
  }
  var green=[0.2,0.55,0.15,1], teal=[0,0.65,0.6,1], purple=[0.3,0.15,0.65,1], grey=[0.4,0.4,0.4,1];
  part(0,1.75,0,   0.22,0.22,0.22, green);
  part(0,1.15,0,   0.22,0.30,0.14, teal);
  part(-0.34,1.35,0, 0.10,0.28,0.10, green, -70+g_zombieArmAngle,[1,0,0]);
  part( 0.34,1.35,0, 0.10,0.28,0.10, green, -70-g_zombieArmAngle,[1,0,0]);
  part(-0.11,0.60,0, 0.10,0.28,0.10, purple,  g_zombieLegAngle,[1,0,0]);
  part( 0.11,0.60,0, 0.10,0.28,0.10, purple, -g_zombieLegAngle,[1,0,0]);
  part(-0.11,0.22,0, 0.10,0.10,0.10, grey,    g_zombieLegAngle,[1,0,0]);
  part( 0.11,0.22,0, 0.10,0.10,0.10, grey,   -g_zombieLegAngle,[1,0,0]);
}

// ──────────────────────────────────────────────────────────────
// CLOUDS
// ──────────────────────────────────────────────────────────────
function updateClouds(dt) {
  for (var i = 0; i < g_clouds.length; i++) {
    g_clouds[i].x += g_clouds[i].speed * dt;
    if (g_clouds[i].x > WORLD_SIZE+10) g_clouds[i].x = -10;
  }
}
function drawClouds() {
  for (var i = 0; i < g_clouds.length; i++) {
    var c = g_clouds[i];
    var M = new Matrix4(); M.setTranslate(c.x,CLOUD_Y,c.z); M.scale(c.w,0.3,c.d);
    drawCube(M,[0.92,0.95,1.0,1.0]);
    var M2 = new Matrix4(); M2.setTranslate(c.x-0.5,CLOUD_Y+0.5,c.z); M2.scale(c.w*0.6,0.3,c.d*0.8);
    drawCube(M2,[0.96,0.97,1.0,1.0]);
  }
}

// ──────────────────────────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────────────────────────
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);

  var eye = camera.eye.elements;
  gl.uniform3f(u_CameraPos, eye[0], eye[1], eye[2]);

  gl.uniform1i(u_Lighting,     g_lightingOn   ? 1 : 0);
  gl.uniform1i(u_ShowNormals,  g_showNormals  ? 1 : 0);
  gl.uniform1i(u_PointLightOn, g_pointLightOn ? 1 : 0);
  gl.uniform1i(u_SpotLightOn,  g_spotLightOn  ? 1 : 0);

  gl.uniform3fv(u_LightPos,    new Float32Array(g_lightPos));
  gl.uniform3fv(u_LightColor,  new Float32Array(g_lightColor));

  // Spot light: camera position, looking forward
  var at = camera.at.elements;
  var sdx = at[0]-eye[0], sdy = at[1]-eye[1], sdz = at[2]-eye[2];
  var sl  = Math.sqrt(sdx*sdx+sdy*sdy+sdz*sdz);
  gl.uniform3f(u_SpotPos,    eye[0], eye[1], eye[2]);
  gl.uniform3f(u_SpotDir,    sdx/sl, sdy/sl, sdz/sl);
  gl.uniform1f(u_SpotCutoff, SPOT_CUTOFF);
  gl.uniform3fv(u_SpotColor, new Float32Array(g_spotColor));

  // Sky box
  var sky = new Matrix4();
  sky.setTranslate(eye[0], eye[1], eye[2]);
  sky.scale(500,500,500);
  drawCube(sky,[0.47,0.65,1.0,1.0]);

  // Ground — explicitly bind grass texture to unit 2 right before drawing
  var ground = new Matrix4();
  ground.setTranslate(16,-0.05,16);
  ground.scale(200,0.01,200);
  if (g_grassTextureReady) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, g_grassTexture);
    gl.uniform1i(u_Sampler, 2);
    gl.uniform1f(u_TexScale, 32.0); // tile grass 32x across the ground
    drawBlockTextured(ground, g_grassTexture, 2);
    gl.uniform1f(u_TexScale, 1.0);  // reset for all other draws
  } else {
    drawCube(ground,[0.35,0.75,0.15,1.0]);
  }

  // World blocks
  for (var r = 0; r < WORLD_SIZE; r++)
    for (var c = 0; c < WORLD_SIZE; c++)
      for (var y = 0; y < MAX_HEIGHT; y++)
        if (g_map[r][c][y] !== 0) drawBlock(c,y,r,g_map[r][c][y]);

  // Light marker cube
  var lm = new Matrix4();
  lm.setTranslate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  lm.scale(0.15,0.15,0.15);
  drawCube(lm,[g_lightColor[0],g_lightColor[1],g_lightColor[2],1.0]);

  // Red sphere — centre piece
  var sm = new Matrix4();
  sm.setTranslate(27.0, 1.0, 27.0);
  sm.scale(0.9, 0.9, 0.9);
  drawSphere(sm,[0.85,0.15,0.1,1.0]);

  // Dragon — screen-LEFT from diagonal camera (higher X, lower Z than sphere)
  if (g_dragon && g_dragon.ready) {
    var dm = new Matrix4();
    dm.setTranslate(29.5, 0.8, 24.0);
    dm.rotate(45, 0, 1, 0);   // face toward camera
    dm.scale(0.34, 0.34, 0.34);
    var dragonUniforms = {
      u_ModelMatrix:  u_ModelMatrix,
      u_NormalMatrix: u_NormalMatrix,
      u_UseTexture:   u_UseTexture,
      u_Color:        u_Color
    };
    g_dragon.draw(dm, [0.25, 0.55, 0.85, 1.0], dragonUniforms);
  }

  drawZombie();
  drawClouds();
}

// ──────────────────────────────────────────────────────────────
// NORMAL MATRIX  (inverse-transpose of model matrix)
// ──────────────────────────────────────────────────────────────
function computeNormalMatrix(M) {
  var nm = new Matrix4(M);
  nm.invert();
  nm.transpose();
  return nm;
}

// ──────────────────────────────────────────────────────────────
// DRAW SOLID-COLOUR CUBE  (uses CUBE_FULL below)
// ──────────────────────────────────────────────────────────────

function drawCube(M, color) {
  var FSIZE  = Float32Array.BYTES_PER_ELEMENT;
  var STRIDE = 8 * FSIZE;   // same layout as CUBE_FULL

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_FULL, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal >= 0) {
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, STRIDE, 3*FSIZE);
    gl.enableVertexAttribArray(a_Normal);
  }

  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) gl.disableVertexAttribArray(a_TexCoord);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, computeNormalMatrix(M).elements);
  gl.uniform1i(u_UseTexture, 0);
  gl.uniform4f(u_Color, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// ──────────────────────────────────────────────────────────────
// DRAW TEXTURED BLOCK
// Fully interleaved: x,y,z, nx,ny,nz, u,v  (stride = 8 floats)
// Normals are baked into the same buffer as positions and UVs
// so they are always guaranteed to stay in sync.
// ──────────────────────────────────────────────────────────────
var CUBE_FULL = new Float32Array([
  // pos(3)        norm(3)       uv(2)
  // ── front face  normal = 0,0,1 ──
  -1,-1, 1,   0, 0, 1,   0,0,
   1,-1, 1,   0, 0, 1,   1,0,
   1, 1, 1,   0, 0, 1,   1,1,
  -1,-1, 1,   0, 0, 1,   0,0,
   1, 1, 1,   0, 0, 1,   1,1,
  -1, 1, 1,   0, 0, 1,   0,1,
  // ── back face  normal = 0,0,-1 ──
  -1,-1,-1,   0, 0,-1,   1,0,
  -1, 1,-1,   0, 0,-1,   1,1,
   1, 1,-1,   0, 0,-1,   0,1,
  -1,-1,-1,   0, 0,-1,   1,0,
   1, 1,-1,   0, 0,-1,   0,1,
   1,-1,-1,   0, 0,-1,   0,0,
  // ── top face  normal = 0,1,0 ──
  -1, 1,-1,   0, 1, 0,   0,0,
  -1, 1, 1,   0, 1, 0,   0,1,
   1, 1, 1,   0, 1, 0,   1,1,
  -1, 1,-1,   0, 1, 0,   0,0,
   1, 1, 1,   0, 1, 0,   1,1,
   1, 1,-1,   0, 1, 0,   1,0,
  // ── bottom face  normal = 0,-1,0 ──
  -1,-1,-1,   0,-1, 0,   0,1,
   1,-1,-1,   0,-1, 0,   1,1,
   1,-1, 1,   0,-1, 0,   1,0,
  -1,-1,-1,   0,-1, 0,   0,1,
   1,-1, 1,   0,-1, 0,   1,0,
  -1,-1, 1,   0,-1, 0,   0,0,
  // ── right face  normal = 1,0,0 ──
   1,-1,-1,   1, 0, 0,   0,0,
   1, 1,-1,   1, 0, 0,   0,1,
   1, 1, 1,   1, 0, 0,   1,1,
   1,-1,-1,   1, 0, 0,   0,0,
   1, 1, 1,   1, 0, 0,   1,1,
   1,-1, 1,   1, 0, 0,   1,0,
  // ── left face  normal = -1,0,0 ──
  -1,-1,-1,  -1, 0, 0,   1,0,
  -1,-1, 1,  -1, 0, 0,   0,0,
  -1, 1, 1,  -1, 0, 0,   0,1,
  -1,-1,-1,  -1, 0, 0,   1,0,
  -1, 1, 1,  -1, 0, 0,   0,1,
  -1, 1,-1,  -1, 0, 0,   1,1
]);

function drawBlockTextured(M, texture, texUnit) {
  if (!texture) { drawCube(M,[0.55,0.38,0.18,1]); return; }

  var FSIZE  = Float32Array.BYTES_PER_ELEMENT;
  var STRIDE = 8 * FSIZE;   // pos(3) + norm(3) + uv(2)

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_FULL, gl.STATIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal >= 0) {
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, STRIDE, 3*FSIZE);
    gl.enableVertexAttribArray(a_Normal);
  }

  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) {
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, STRIDE, 6*FSIZE);
    gl.enableVertexAttribArray(a_TexCoord);
  }

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, computeNormalMatrix(M).elements);

  var glUnits = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2];
  var unit = (texUnit >= 0 && texUnit <= 2) ? texUnit : 0;
  gl.activeTexture(glUnits[unit]);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_Sampler, unit);
  gl.uniform1i(u_UseTexture, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// Backward-compat wrappers used by older draw calls
function drawCubeTextured(M) {
  if (g_textureReady) drawBlockTextured(M, g_texture, 0);
  else drawCube(M,[0.55,0.38,0.18,1]);
}

// ──────────────────────────────────────────────────────────────
// DRAW BLOCK from map
// ──────────────────────────────────────────────────────────────
function drawBlock(bx, by, bz, type) {
  var M = new Matrix4();
  M.setTranslate(bx+0.5, by+0.5, bz+0.5);
  M.scale(0.5,0.5,0.5);
  if      (type === 2 && g_sandTextureReady)  drawBlockTextured(M, g_sandTexture,  1);
  else if (g_textureReady)                    drawBlockTextured(M, g_texture,      0);
  else                                        drawCube(M,[0.55,0.38,0.18,1]);
}

// ──────────────────────────────────────────────────────────────
// DRAW SPHERE  (UV-sphere, normal = position for unit sphere)
// FIX: uses plain index loops — no for...of or spread
// ──────────────────────────────────────────────────────────────
function drawSphere(M, color) {
  var stacks = 20, slices = 20;
  var verts  = [];
  var norms  = [];

  for (var i = 0; i < stacks; i++) {
    var phi0 = Math.PI * i       / stacks;
    var phi1 = Math.PI * (i + 1) / stacks;

    for (var j = 0; j < slices; j++) {
      var th0 = 2 * Math.PI * j       / slices;
      var th1 = 2 * Math.PI * (j + 1) / slices;

      // 4 corners
      var x0 = Math.sin(phi0)*Math.cos(th0), y0 = Math.cos(phi0), z0 = Math.sin(phi0)*Math.sin(th0);
      var x1 = Math.sin(phi1)*Math.cos(th0), y1 = Math.cos(phi1), z1 = Math.sin(phi1)*Math.sin(th0);
      var x2 = Math.sin(phi1)*Math.cos(th1), y2 = Math.cos(phi1), z2 = Math.sin(phi1)*Math.sin(th1);
      var x3 = Math.sin(phi0)*Math.cos(th1), y3 = Math.cos(phi0), z3 = Math.sin(phi0)*Math.sin(th1);

      // Triangle 1: 0,1,2
      verts.push(x0,y0,z0,  x1,y1,z1,  x2,y2,z2);
      norms.push(x0,y0,z0,  x1,y1,z1,  x2,y2,z2);
      // Triangle 2: 0,2,3
      verts.push(x0,y0,z0,  x2,y2,z2,  x3,y3,z3);
      norms.push(x0,y0,z0,  x2,y2,z2,  x3,y3,z3);
    }
  }

  var vertsF = new Float32Array(verts);
  var normsF = new Float32Array(norms);
  var count  = verts.length / 3;

  // Upload positions
  var posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, vertsF, gl.DYNAMIC_DRAW);
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Upload normals
  var normBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
  gl.bufferData(gl.ARRAY_BUFFER, normsF, gl.DYNAMIC_DRAW);
  var a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal >= 0) {
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  // Disable tex coord
  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) gl.disableVertexAttribArray(a_TexCoord);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniformMatrix4fv(u_NormalMatrix, false, computeNormalMatrix(M).elements);
  gl.uniform1i(u_UseTexture, 0);
  gl.uniform4f(u_Color, color[0], color[1], color[2], color[3]);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}
