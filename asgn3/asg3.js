// ============================================================
// Assignment 3 – Virtual World  (First-Person Explorer)
// ============================================================
// Controls:
//   Click canvas  → lock pointer (mouse-look)
//   WASD          → moveForward / moveBackwards / moveLeft / moveRight
//   Q             → panLeft
//   E             → panRight
//   Mouse         → look around
// ============================================================

// ---------- Shaders ----------
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'attribute vec2 a_TexCoord;\n' +
  'uniform mat4 u_ViewMatrix;\n' +
  'uniform mat4 u_ProjMatrix;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;\n' +
  '  v_TexCoord = a_TexCoord;\n' +
  '}\n';

var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_Color;\n' +
  'uniform sampler2D u_Sampler;\n' +
  'uniform int u_UseTexture;\n' +
  'varying vec2 v_TexCoord;\n' +
  'void main() {\n' +
  '  if (u_UseTexture == 1) {\n' +
  '    gl_FragColor = texture2D(u_Sampler, v_TexCoord);\n' +
  '  } else {\n' +
  '    gl_FragColor = u_Color;\n' +
  '  }\n' +
  '}\n';

// ---------- Globals ----------
var gl;
var g_canvas;

// Global camera object — instantiated in main()
var camera;

// Input
var g_keys = {};
var g_pointerLocked = false;

// FPS
var g_lastTime = performance.now();
var g_frameCount = 0;

// Texture — dirt
var g_texture      = null;
var g_u_Sampler    = null;
var g_textureReady = false;

// Texture — sand
var g_sandTexture      = null;
var g_sandTextureReady = false;

// Texture — grass (ground)
var g_grassTexture      = null;
var g_grassTextureReady = false;

// Zombie state
var g_zombieX = 20.5;
var g_zombieZ = 20.5;
var g_zombieY = 0.0;
var g_zombieAngle = 0;      // facing angle in degrees
var g_zombieArmAngle = 0;   // arm swing animation
var g_zombieLegAngle = 0;   // leg swing animation

// Cloud state
var g_clouds = [];
var CLOUD_Y = 12.0;

function buildClouds() {
  // Each cloud: {x, z, w, d, speed} — x/z=position, w/d=width/depth in blocks, speed=drift
  var shapes = [
    {x:  8, z:  6, w: 5, d: 2, speed: 0.4},
    {x: 18, z: 10, w: 7, d: 2, speed: 0.3},
    {x:  4, z: 18, w: 4, d: 2, speed: 0.5},
    {x: 22, z: 14, w: 6, d: 3, speed: 0.35},
    {x: 12, z: 24, w: 5, d: 2, speed: 0.45},
    {x: 26, z:  4, w: 8, d: 2, speed: 0.25},
    {x:  2, z: 28, w: 6, d: 2, speed: 0.55},
    {x: 20, z: 26, w: 4, d: 3, speed: 0.3},
  ];
  g_clouds = shapes;
}

// Uniform locations
var u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_Color, u_UseTexture, u_Sampler;

// Block types: 0=empty, 1=dirt, 2=sand
var WORLD_SIZE = 32;
var MAX_HEIGHT  = 8;
var g_map = [];

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
  for (var i = 2; i < 9; i++)   setCol(14,i,2);
  for (var i = 23; i < 30; i++) setCol(14,i,2);
  setCol(8,16,2); setCol(5,13,1); setCol(5,19,1);
  setCol(20,8,2); setCol(20,24,2); setCol(24,16,2);
  setCol(12,6,1); setCol(12,26,1);
}

// ---------- main ----------
function main() {
  g_canvas = document.getElementById('webgl');
  gl = getWebGLContext(g_canvas);
  if (!gl) { console.log('WebGL context failed'); return; }

  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.47, 0.65, 1.0, 1.0); // blue sky

  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Shader init failed'); return;
  }

  // Cache uniform locations
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix  = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix  = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_Color       = gl.getUniformLocation(gl.program, 'u_Color');
  u_UseTexture  = gl.getUniformLocation(gl.program, 'u_UseTexture');
  u_Sampler     = gl.getUniformLocation(gl.program, 'u_Sampler');

  // Instantiate global camera object (rubric #6)
  camera = new Camera(g_canvas);

  initTextures();
  initSandTexture();
  initGrassTexture();
  buildMap();
  buildClouds();
  setupInput();
  tick();
}

// ---------- Texture ----------
function initTextures() {
  var texture = gl.createTexture();   // Create a texture object
  if (!texture) {
    console.log('Failed to create the texture object');
    return false;
  }

  // Get the storage location of u_Sampler
  var u_SamplerLoc = gl.getUniformLocation(gl.program, 'u_Sampler');
  if (!u_SamplerLoc) {
    console.log('Failed to get the storage location of u_Sampler');
    return false;
  }

  var image = new Image();   // Create the image object
  if (!image) {
    console.log('Failed to create the image object');
    return false;
  }
  // Register the event handler to be called on loading an image
  image.onload = function() { loadTexture(texture, u_SamplerLoc, image); };
  // Tell the browser to load an image
  image.src = 'pack_3530346.jpg.webp';

  return true;
}

function loadTexture(texture, u_SamplerLoc, image) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);  // Flip the image's y axis
  // Enable texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  // Bind the texture object to the target
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Set the texture parameters
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  // Set the texture image
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // Set the texture unit 0 to the sampler
  gl.uniform1i(u_SamplerLoc, 0);

  // Store globally so drawCubeTextured can bind it each frame
  g_texture      = texture;
  g_u_Sampler    = u_SamplerLoc;
  g_textureReady = true;
  console.log('Texture loaded successfully');
}

function initSandTexture() {
  var texture = gl.createTexture();
  if (!texture) { console.log('Failed to create sand texture'); return false; }
  var image = new Image();
  if (!image) { console.log('Failed to create sand image'); return false; }
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    g_sandTexture      = texture;
    g_sandTextureReady = true;
    console.log('Sand texture loaded');
  };
  image.src = 'sand.png';
  return true;
}


function initGrassTexture() {
  var texture = gl.createTexture();
  if (!texture) { console.log('Failed to create grass texture'); return false; }
  var image = new Image();
  if (!image) { return false; }
  image.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    g_grassTexture      = texture;
    g_grassTextureReady = true;
    console.log('Grass texture loaded');
  };
  image.src = 'grass.jpg';
  return true;
}

function setupInput() {
  // Pointer lock for free mouse-look
  g_canvas.addEventListener('click', function() {
    g_canvas.requestPointerLock();
  });
  document.addEventListener('pointerlockchange', function() {
    g_pointerLocked = (document.pointerLockElement === g_canvas);
  });
  document.addEventListener('mousemove', function(e) {
    if (!g_pointerLocked) return;
    if (e.movementX > 0) camera.panRight(e.movementX * 0.25);
    if (e.movementX < 0) camera.panLeft(-e.movementX * 0.25);
    if (e.movementY !== 0) camera.tiltVertical(e.movementY * 0.25);
  });

  document.addEventListener('keydown', function(e) {
    g_keys[e.key.toLowerCase()] = true;
  });
  document.addEventListener('keyup', function(e) {
    g_keys[e.key.toLowerCase()] = false;
  });

  // Q = panLeft, E = panRight (rubric requirement)
  // F = add block in front, R = delete block in front (Simple Minecraft)
  document.addEventListener('keydown', function(e) {
    var key = e.key.toLowerCase();
    if (key === 'q') camera.panLeft(5);
    if (key === 'e') camera.panRight(5);
    if (key === 'f') addBlock();
    if (key === 'r') deleteBlock();
  });
}

// ---------- Game loop ----------
function tick() {
  var now = performance.now();
  var dt  = (now - g_lastTime) / 1000;
  g_lastTime = now;

  g_frameCount++;
  if (g_frameCount % 30 === 0) {
    document.getElementById('fpsDisplay').textContent = Math.round(1 / dt);
  }

  updateMovement(dt);
  updateZombie(dt);
  updateClouds(dt);
  renderScene();
  requestAnimationFrame(tick);
}

var SPEED = 5.0;
var CAM_MIN_Y = 0.5;  // never let the camera go below this height

function updateMovement(dt) {
  var speed = SPEED * dt;
  // W/S/A/D call Camera methods directly (rubric #7)
  if (g_keys['w']) camera.moveForward(speed);
  if (g_keys['s']) camera.moveBackwards(speed);
  if (g_keys['a']) camera.moveLeft(speed);
  if (g_keys['d']) camera.moveRight(speed);

  // Clamp Y so the player can never go underground
  if (camera.eye.elements[1] < CAM_MIN_Y) {
    var diff = CAM_MIN_Y - camera.eye.elements[1];
    camera.eye.elements[1] = CAM_MIN_Y;
    camera.at.elements[1] += diff;
    camera.updateViewMatrix();
  }

  var e = camera.eye.elements;
  document.getElementById('posDisplay').textContent =
    e[0].toFixed(1) + ', ' + e[1].toFixed(1) + ', ' + e[2].toFixed(1);
}

// Get the map cell one step directly in front of the camera
function getTargetCell() {
  var eye = camera.eye.elements;
  var at  = camera.at.elements;
  // Horizontal look direction
  var dx = at[0] - eye[0];
  var dz = at[2] - eye[2];
  var len = Math.sqrt(dx*dx + dz*dz);
  if (len < 0.0001) return null;
  dx /= len; dz /= len;
  var tx = Math.floor(eye[0] + dx * 1.8);
  var tz = Math.floor(eye[2] + dz * 1.8);
  if (tx < 0 || tx >= WORLD_SIZE || tz < 0 || tz >= WORLD_SIZE) return null;
  return { r: tz, c: tx };
}

function addBlock() {
  var cell = getTargetCell(); if (!cell) return;
  var h = getHeight(cell.r, cell.c);
  if (h < MAX_HEIGHT) g_map[cell.r][cell.c][h] = 1;
}

function deleteBlock() {
  var cell = getTargetCell(); if (!cell) return;
  var h = getHeight(cell.r, cell.c);
  if (h > 0) g_map[cell.r][cell.c][h-1] = 0;
}

// ---------- Zombie AI ----------
var ZOMBIE_SPEED = 1.5;

function updateZombie(dt) {
  var eye = camera.eye.elements;
  var dx  = eye[0] - g_zombieX;
  var dz  = eye[2] - g_zombieZ;
  var dist = Math.sqrt(dx*dx + dz*dz);

  if (dist > 0.6) {
    // Move toward player
    var nx = g_zombieX + (dx/dist) * ZOMBIE_SPEED * dt;
    var nz = g_zombieZ + (dz/dist) * ZOMBIE_SPEED * dt;
    // Only move if the target cell is empty
    var cr = Math.floor(nz), cc = Math.floor(nx);
    if (cr >= 0 && cr < WORLD_SIZE && cc >= 0 && cc < WORLD_SIZE && getHeight(cr,cc) === 0) {
      g_zombieX = nx;
      g_zombieZ = nz;
    }
    // Face toward player
    g_zombieAngle = Math.atan2(dx, dz) * 180 / Math.PI;
    // Animate arms and legs
    g_zombieArmAngle = 40 * Math.sin(performance.now() / 200);
    g_zombieLegAngle = 30 * Math.sin(performance.now() / 200);
  }
}

// ---------- Draw zombie ----------
function drawZombie() {
  var x = g_zombieX, z = g_zombieZ, y = g_zombieY;

  function part(tx, ty, tz, sx, sy, sz, color, extraRotAngle, extraRotAxis) {
    var M = new Matrix4();
    M.setTranslate(x, y, z);
    M.rotate(g_zombieAngle, 0, 1, 0);
    M.translate(tx, ty, tz);
    if (extraRotAngle !== undefined) {
      M.rotate(extraRotAngle, extraRotAxis[0], extraRotAxis[1], extraRotAxis[2]);
    }
    M.scale(sx, sy, sz);
    drawCube(M, color);
  }

  var green  = [0.2, 0.55, 0.15, 1.0];   // head + arms
  var teal   = [0.0, 0.65, 0.60, 1.0];   // shirt / torso
  var purple = [0.30, 0.15, 0.65, 1.0];  // pants
  var grey   = [0.40, 0.40, 0.40, 1.0];  // boots

  // Head
  part(0, 1.75, 0,   0.22, 0.22, 0.22, green);
  // Torso (teal shirt)
  part(0, 1.15, 0,   0.22, 0.30, 0.14, teal);
  // Left arm — raised forward (zombie pose)
  part(-0.34, 1.35, 0,  0.10, 0.28, 0.10, green,  -70 + g_zombieArmAngle, [1,0,0]);
  // Right arm — raised forward
  part( 0.34, 1.35, 0,  0.10, 0.28, 0.10, green,  -70 - g_zombieArmAngle, [1,0,0]);
  // Left leg (purple pants)
  part(-0.11, 0.60, 0,  0.10, 0.28, 0.10, purple,  g_zombieLegAngle, [1,0,0]);
  // Right leg
  part( 0.11, 0.60, 0,  0.10, 0.28, 0.10, purple, -g_zombieLegAngle, [1,0,0]);
  // Left boot
  part(-0.11, 0.22, 0,  0.10, 0.10, 0.10, grey,  g_zombieLegAngle, [1,0,0]);
  // Right boot
  part( 0.11, 0.22, 0,  0.10, 0.10, 0.10, grey, -g_zombieLegAngle, [1,0,0]);
}

// Draw a cube using a specific texture object (for multi-texture support)
function drawCubeWithTexture(M, texture) {
  var data = new Float32Array([
    -1,-1, 1,  0,0,   1,-1, 1,  1,0,   1, 1, 1,  1,1,
    -1,-1, 1,  0,0,   1, 1, 1,  1,1,  -1, 1, 1,  0,1,
    -1,-1,-1,  1,0,  -1, 1,-1,  1,1,   1, 1,-1,  0,1,
    -1,-1,-1,  1,0,   1, 1,-1,  0,1,   1,-1,-1,  0,0,
    -1, 1,-1,  0,0,  -1, 1, 1,  0,1,   1, 1, 1,  1,1,
    -1, 1,-1,  0,0,   1, 1, 1,  1,1,   1, 1,-1,  1,0,
    -1,-1,-1,  0,1,   1,-1,-1,  1,1,   1,-1, 1,  1,0,
    -1,-1,-1,  0,1,   1,-1, 1,  1,0,  -1,-1, 1,  0,0,
     1,-1,-1,  0,0,   1, 1,-1,  0,1,   1, 1, 1,  1,1,
     1,-1,-1,  0,0,   1, 1, 1,  1,1,   1,-1, 1,  1,0,
    -1,-1,-1,  1,0,  -1,-1, 1,  0,0,  -1, 1, 1,  0,1,
    -1,-1,-1,  1,0,  -1, 1, 1,  0,1,  -1, 1,-1,  1,1,
  ]);
  var FSIZE = data.BYTES_PER_ELEMENT, STRIDE = 5 * FSIZE;
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) {
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, STRIDE, 3 * FSIZE);
    gl.enableVertexAttribArray(a_TexCoord);
  }

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_Sampler, 1);
  gl.uniform1i(u_UseTexture, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 36);

  // Restore dirt texture on unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, g_texture);
  gl.uniform1i(u_Sampler, 0);
}


// ---------- Clouds ----------
function updateClouds(dt) {
  for (var i = 0; i < g_clouds.length; i++) {
    g_clouds[i].x += g_clouds[i].speed * dt;
    // Wrap around the world
    if (g_clouds[i].x > WORLD_SIZE + 10) g_clouds[i].x = -10;
  }
}

function drawClouds() {
  for (var i = 0; i < g_clouds.length; i++) {
    var c = g_clouds[i];
    // Main slab
    var M = new Matrix4();
    M.setTranslate(c.x, CLOUD_Y, c.z);
    M.scale(c.w, 0.3, c.d);
    drawCube(M, [0.92, 0.95, 1.0, 1.0]);
    // Second layer on top (slightly smaller, offset) for puffy look
    var M2 = new Matrix4();
    M2.setTranslate(c.x - 0.5, CLOUD_Y + 0.5, c.z);
    M2.scale(c.w * 0.6, 0.3, c.d * 0.8);
    drawCube(M2, [0.96, 0.97, 1.0, 1.0]);
  }
}

// ---------- Render ----------
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Upload view + projection matrices from the Camera object
  gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);

  // Sky box: giant cube centred on camera, drawn first (rubric #9)
  var sky = new Matrix4();
  var e = camera.eye.elements;
  sky.setTranslate(e[0], e[1], e[2]);
  sky.scale(500, 500, 500);
  drawCube(sky, [0.47, 0.65, 1.0, 1.0]);

  // Ground: flattened cube on y axis, in x-z plane (rubric #8)
  var ground = new Matrix4();
  ground.setTranslate(16, -0.05, 16);
  ground.scale(200, 0.01, 200);
  if (g_grassTextureReady) drawCubeTexturedWith(ground, g_grassTexture);
  else drawCube(ground, [0.35, 0.75, 0.15, 1.0]);

  // World blocks: triple nested loop over 32x32 map (rubric #10)
  for (var r = 0; r < WORLD_SIZE; r++) {
    for (var c = 0; c < WORLD_SIZE; c++) {
      for (var y = 0; y < MAX_HEIGHT; y++) {
        if (g_map[r][c][y] !== 0) drawBlock(c, y, r, g_map[r][c][y]);
      }
    }
  }

  // Draw the zombie
  drawZombie();
  // Draw clouds
  drawClouds();
}

// Draw one block — dirt or sand depending on type
function drawBlock(bx, by, bz, type) {
  var M = new Matrix4();
  M.setTranslate(bx + 0.5, by + 0.5, bz + 0.5);
  M.scale(0.5, 0.5, 0.5);
  if (type === 2 && g_sandTextureReady) drawCubeTexturedWith(M, g_sandTexture);
  else drawCubeTextured(M);
}

// Draw a cube with any given texture
function drawCubeTexturedWith(M, texture) {
  var data = new Float32Array([
    -1,-1, 1,  0,0,   1,-1, 1,  1,0,   1, 1, 1,  1,1,
    -1,-1, 1,  0,0,   1, 1, 1,  1,1,  -1, 1, 1,  0,1,
    -1,-1,-1,  1,0,  -1, 1,-1,  1,1,   1, 1,-1,  0,1,
    -1,-1,-1,  1,0,   1, 1,-1,  0,1,   1,-1,-1,  0,0,
    -1, 1,-1,  0,0,  -1, 1, 1,  0,1,   1, 1, 1,  1,1,
    -1, 1,-1,  0,0,   1, 1, 1,  1,1,   1, 1,-1,  1,0,
    -1,-1,-1,  0,1,   1,-1,-1,  1,1,   1,-1, 1,  1,0,
    -1,-1,-1,  0,1,   1,-1, 1,  1,0,  -1,-1, 1,  0,0,
     1,-1,-1,  0,0,   1, 1,-1,  0,1,   1, 1, 1,  1,1,
     1,-1,-1,  0,0,   1, 1, 1,  1,1,   1,-1, 1,  1,0,
    -1,-1,-1,  1,0,  -1,-1, 1,  0,0,  -1, 1, 1,  0,1,
    -1,-1,-1,  1,0,  -1, 1, 1,  0,1,  -1, 1,-1,  1,1,
  ]);
  var FSIZE = data.BYTES_PER_ELEMENT, STRIDE = 5 * FSIZE;
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);
  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) {
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, STRIDE, 3 * FSIZE);
    gl.enableVertexAttribArray(a_TexCoord);
  }
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(u_Sampler, 0);
  gl.uniform1i(u_UseTexture, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// Draw a solid-colour cube (vertices -1 to +1 on each axis)
function drawCube(M, color) {
  var vertices = new Float32Array([
    // Front
    -1,-1, 1,   1,-1, 1,   1, 1, 1,
    -1,-1, 1,   1, 1, 1,  -1, 1, 1,
    // Back
    -1,-1,-1,  -1, 1,-1,   1, 1,-1,
    -1,-1,-1,   1, 1,-1,   1,-1,-1,
    // Top
    -1, 1,-1,  -1, 1, 1,   1, 1, 1,
    -1, 1,-1,   1, 1, 1,   1, 1,-1,
    // Bottom
    -1,-1,-1,   1,-1,-1,   1,-1, 1,
    -1,-1,-1,   1,-1, 1,  -1,-1, 1,
    // Right
     1,-1,-1,   1, 1,-1,   1, 1, 1,
     1,-1,-1,   1, 1, 1,   1,-1, 1,
    // Left
    -1,-1,-1,  -1,-1, 1,  -1, 1, 1,
    -1,-1,-1,  -1, 1, 1,  -1, 1,-1,
  ]);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) gl.disableVertexAttribArray(a_TexCoord);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);
  gl.uniform4f(u_Color, color[0], color[1], color[2], color[3]);
  gl.uniform1i(u_UseTexture, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

// Draw a cube with the dirt texture mapped on all 6 faces
function drawCubeTextured(M) {
  var data = new Float32Array([
    // Front  (z=+1)
    -1,-1, 1,  0,0,   1,-1, 1,  1,0,   1, 1, 1,  1,1,
    -1,-1, 1,  0,0,   1, 1, 1,  1,1,  -1, 1, 1,  0,1,
    // Back   (z=-1)
    -1,-1,-1,  1,0,  -1, 1,-1,  1,1,   1, 1,-1,  0,1,
    -1,-1,-1,  1,0,   1, 1,-1,  0,1,   1,-1,-1,  0,0,
    // Top    (y=+1)
    -1, 1,-1,  0,0,  -1, 1, 1,  0,1,   1, 1, 1,  1,1,
    -1, 1,-1,  0,0,   1, 1, 1,  1,1,   1, 1,-1,  1,0,
    // Bottom (y=-1)
    -1,-1,-1,  0,1,   1,-1,-1,  1,1,   1,-1, 1,  1,0,
    -1,-1,-1,  0,1,   1,-1, 1,  1,0,  -1,-1, 1,  0,0,
    // Right  (x=+1)
     1,-1,-1,  0,0,   1, 1,-1,  0,1,   1, 1, 1,  1,1,
     1,-1,-1,  0,0,   1, 1, 1,  1,1,   1,-1, 1,  1,0,
    // Left   (x=-1)
    -1,-1,-1,  1,0,  -1,-1, 1,  0,0,  -1, 1, 1,  0,1,
    -1,-1,-1,  1,0,  -1, 1, 1,  0,1,  -1, 1,-1,  1,1,
  ]);

  var FSIZE  = data.BYTES_PER_ELEMENT;
  var STRIDE = 5 * FSIZE;

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, STRIDE, 0);
  gl.enableVertexAttribArray(a_Position);

  var a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  if (a_TexCoord >= 0) {
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, STRIDE, 3 * FSIZE);
    gl.enableVertexAttribArray(a_TexCoord);
  }

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  if (g_textureReady) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, g_texture);
    gl.uniform1i(g_u_Sampler, 0);
    gl.uniform1i(u_UseTexture, 1);
  } else {
    gl.uniform1i(u_UseTexture, 0);
    gl.uniform4f(u_Color, 0.55, 0.38, 0.18, 1.0); // fallback brown
  }

  gl.drawArrays(gl.TRIANGLES, 0, 36);
}