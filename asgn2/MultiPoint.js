var g_globalAngle = 0;
var g_backLeftLegAngle = 0;
var g_frontLeftThighAngle = 0;
var g_frontLeftCalfAngle = 0;
var g_frontRightLegAngle = 0;
var g_backRightLegAngle = 0;
var g_frontLeftPawAngle = 0;
var g_frontRightPawAngle = 0;
var g_backLeftPawAngle = 0;
var g_backRightPawAngle = 0;
var g_startTime = performance.now()/1000.0;
var g_seconds = 0;
var g_animating = false;
var g_tailAngle = -40;
var grey = [0.6, 0.6, 0.6, 1.0];
var darkGrey = [0.3, 0.3, 0.3, 1.0];
var lightGrey = [0.8, 0.8, 0.8, 1.0];
var beige = [0.76, 0.60, 0.42, 1.0];
var red = [0.8, 0.1, 0.1, 1.0];
var g_headAngle = 0;
var g_bodyBob = 0;
var g_mouseX = 0;
var g_mouseY = 0;
var g_poking = false;
var g_pokeTime = 0;
var g_sitAngle = 0;
var g_sitBodyAngle = 0;
var g_sitDropY = 0;
var g_lastFrameTime = performance.now();
var g_frameCount = 0;
var g_fps = 0;

// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
  'uniform mat4 u_GlobalRotation;\n' +
  'uniform mat4 u_GlobalRotationY;\n' +
  'void main() {\n' +
  '  gl_Position = u_GlobalRotationY * u_GlobalRotation * u_ModelMatrix * a_Position;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_Color;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_Color;\n' +
  '}\n';

var gl;

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  gl = getWebGLContext(canvas);
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  // Enable depth test so 3D geometry looks correct
  gl.enable(gl.DEPTH_TEST);

  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  // Specify the color for clearing <canvas>
  gl.clearColor(0, 0, 0, 1);

  // Draw the scene
  tick();

  document.getElementById('globalRotSlider').addEventListener('input', function() {
    g_globalAngle = parseFloat(this.value);
    renderScene();
  });
  document.getElementById('backLeftLegSlider').addEventListener('input', function() {
    g_backLeftLegAngle = parseFloat(this.value);
    renderScene();
  });
  document.getElementById('frontLeftThighSlider').addEventListener('input', function() {
    g_frontLeftThighAngle = parseFloat(this.value);
    renderScene();
  });
  document.getElementById('frontLeftCalfSlider').addEventListener('input', function() {
    g_frontLeftCalfAngle = parseFloat(this.value);
    renderScene();
  });
  document.getElementById('animBtn').addEventListener('click', function() {
    g_animating = !g_animating;
    this.textContent = g_animating ? 'Stop Animation' : 'Start Animation';
  });
  canvas.addEventListener('mousemove', function(ev) {
    if (ev.buttons == 1) {  // only when left button held
      g_mouseX = (ev.clientX - canvas.width/2) / canvas.width * 360;
      g_mouseY = (ev.clientY - canvas.height/2) / canvas.height * 360;
      renderScene();
    }
  });
  canvas.addEventListener('click', function(ev) {
    if (ev.shiftKey) {
      g_poking = true;
      g_pokeTime = g_seconds;
    }
  });
}

function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  var M = new Matrix4();

  // Body
  //M.setTranslate(0, g_bodyBob, 0);
  //M.scale(0.4, 0.25, 0.2);
  //drawCube(M, grey);

  // Front Body
  var M = new Matrix4();
  M.setTranslate(0.1, g_bodyBob, 0);
  M.scale(0.25, 0.25, 0.2);
  drawCube(M, grey);

  // Back Body (rotates down when sitting)
  var backBody = new Matrix4();
  backBody.setTranslate(-0.1, g_bodyBob + g_sitDropY - 0.05, 0);
  backBody.rotate(g_sitAngle, 0, 0, 1);
  backBody.scale(0.25, 0.25, 0.2);
  drawCube(backBody, grey);

  // Head
  var head = new Matrix4();
  head.setTranslate(0.38, 0.18 + g_bodyBob, 0.0);
  head.rotate(g_headAngle, 0, 0, 1);
  head.scale(0.22, 0.22, 0.22);
  drawCube(head, lightGrey);

  // Collar
  var collar = new Matrix4();
  collar.setTranslate(0.13, 0.09 + g_bodyBob, 0.0);
  collar.scale(0.03, 0.19, 0.22);
  drawCube(collar, red);

  // Collar horizontal band
  var collarBand = new Matrix4();
  collarBand.setTranslate(0.28, -0.07 + g_bodyBob, 0.0);
  collarBand.scale(0.15, 0.03, 0.22);
  drawCube(collarBand, red);

  // Snout
  var snout = new Matrix4();
  snout.setTranslate(0.56, 0.09 + g_bodyBob, 0.0);
  snout.rotate(g_headAngle, 0, 0, 1);
  snout.scale(0.14, 0.12, 0.14);
  drawCube(snout, beige);

  // Nose
  var nose = new Matrix4();
  nose.setTranslate(0.7, 0.2 + g_bodyBob, 0.0);
  nose.rotate(g_headAngle, 0, 0, 1);
  nose.scale(0.03, 0.04, 0.06);
  drawCube(nose, darkGrey);

  // Left Eye
  var leftEye = new Matrix4();
  leftEye.setTranslate(0.54, 0.22 + g_bodyBob, 0.2);
  leftEye.rotate(90, 1, 0, 0);
  leftEye.rotate(g_headAngle, 0, 0, 1);
  leftEye.scale(0.03, 0.03, 0.03);
  drawCylinder(leftEye, darkGrey);

  // Right Eye
  var rightEye = new Matrix4();
  rightEye.setTranslate(0.54, 0.22 + g_bodyBob, -0.2);
  rightEye.rotate(90, 1, 0, 0);
  rightEye.rotate(g_headAngle, 0, 0, 1);
  rightEye.scale(0.03, 0.03, 0.03);
  drawCylinder(rightEye, darkGrey);

  // Left Ear
  var leftEar = new Matrix4();
  leftEar.setTranslate(0.34, 0.36 + g_bodyBob, 0.08);
  leftEar.rotate(g_headAngle, 0, 0, 1);
  leftEar.scale(0.06, 0.13, 0.05);
  drawCube(leftEar, darkGrey);

  // Right Ear
  var rightEar = new Matrix4();
  rightEar.setTranslate(0.34, 0.36 + g_bodyBob, -0.08);
  rightEar.rotate(g_headAngle, 0, 0, 1);
  rightEar.scale(0.06, 0.13, 0.05);
  drawCube(rightEar, darkGrey);

  // Tail
  var tail = new Matrix4();
  tail.setTranslate(-0.1, g_bodyBob + g_sitDropY - 0.05, 0.0);
  tail.rotate(g_sitAngle, 0, 0, 1);
  tail.translate(-0.25, 0.18, 0.0);
  tail.rotate(g_tailAngle, 0, 0, 1);
  tail.translate(0, -0.22, 0);
  tail.scale(0.06, 0.22, 0.06);
  drawCube(tail, grey);

  // Front Left Thigh
  var thigh = new Matrix4();
  thigh.setTranslate(0.25, -0.2, 0.12);
  thigh.rotate(g_frontLeftThighAngle, 0, 0, 1);
  thigh.scale(0.07, 0.12, 0.07);
  drawCube(thigh, grey);

  // Front Left Calf
  var calf = new Matrix4();
  calf.setTranslate(0.25, -0.2, 0.12);
  calf.rotate(g_frontLeftThighAngle, 0, 0, 1);
  calf.translate(0, -0.22, 0);
  calf.rotate(g_frontLeftCalfAngle, 0, 0, 1);
  calf.scale(0.07, 0.12, 0.07);
  drawCube(calf, grey);

  // Front Left Paw
  var frontLeftPaw = new Matrix4();
  frontLeftPaw.setTranslate(0.27, -0.2, 0.12);
  frontLeftPaw.rotate(g_frontLeftThighAngle, 0, 0, 1);
  frontLeftPaw.translate(0, -0.11, 0);
  frontLeftPaw.rotate(g_frontLeftCalfAngle, 0, 0, 1);
  frontLeftPaw.translate(0, -0.22, 0);
  frontLeftPaw.rotate(g_frontLeftPawAngle, 0, 0, 1);
  frontLeftPaw.scale(0.09, 0.05, 0.09);
  drawCube(frontLeftPaw, grey);

  // Front Right Paw
  var frontRightPaw = new Matrix4();
  frontRightPaw.setTranslate(0.27, -0.35, -0.12);
  frontRightPaw.rotate(g_frontRightLegAngle, 0, 0, 1);
  frontRightPaw.translate(0, -0.18, 0);
  frontRightPaw.rotate(g_frontRightPawAngle, 0, 0, 1);
  frontRightPaw.scale(0.09, 0.05, 0.09);
  drawCube(frontRightPaw, grey);

  // Front Right Leg
  var frontRightLeg = new Matrix4();
  frontRightLeg.setTranslate(0.25, -0.35, -0.12);
  frontRightLeg.rotate(g_frontRightLegAngle, 0, 0, 1);
  frontRightLeg.scale(0.07, 0.18, 0.07);
  drawCube(frontRightLeg, grey);

  // Back Left Leg
  var backLeftLeg = new Matrix4();
  backLeftLeg.setTranslate(-0.1, g_bodyBob + g_sitDropY - 0.05, 0.12);
  backLeftLeg.rotate(g_sitAngle, 0, 0, 1);
  backLeftLeg.translate(-0.15, -0.30, 0);
  backLeftLeg.rotate(g_backLeftLegAngle, 0, 0, 1);
  backLeftLeg.scale(0.07, 0.18, 0.07);
  drawCube(backLeftLeg, grey);

  // Back Right Leg
  var backRightLeg = new Matrix4();
  backRightLeg.setTranslate(-0.1, g_bodyBob + g_sitDropY - 0.05, -0.12);
  backRightLeg.rotate(g_sitAngle, 0, 0, 1);
  backRightLeg.translate(-0.15, -0.30, 0);
  backRightLeg.rotate(g_backRightLegAngle, 0, 0, 1);
  backRightLeg.scale(0.07, 0.18, 0.07);
  drawCube(backRightLeg, grey);

  /// Back Left Paw
  var backLeftPaw = new Matrix4();
  backLeftPaw.setTranslate(-0.08, g_bodyBob + g_sitDropY - 0.1, 0.12);
  backLeftPaw.rotate(g_sitAngle, 0, 0, 1);
  backLeftPaw.translate(-0.15, -0.25, 0);
  backLeftPaw.rotate(g_backLeftLegAngle, 0, 0, 1);
  backLeftPaw.translate(0, -0.18, 0);
  backLeftPaw.rotate(g_backLeftPawAngle, 0, 0, 1);
  backLeftPaw.scale(0.09, 0.05, 0.09);
  drawCube(backLeftPaw, grey);

  // Back Right Paw
  var backRightPaw = new Matrix4();
  backRightPaw.setTranslate(-0.08, g_bodyBob + g_sitDropY - 0.1, -0.12);
  backRightPaw.rotate(g_sitAngle, 0, 0, 1);
  backRightPaw.translate(-0.15, -0.25, 0);
  backRightPaw.rotate(g_backRightLegAngle, 0, 0, 1);
  backRightPaw.translate(0, -0.18, 0);
  backRightPaw.rotate(g_backRightPawAngle, 0, 0, 1);
  backRightPaw.scale(0.09, 0.05, 0.09);
  drawCube(backRightPaw, grey);
}

function tick() {
  // FPS calculation
  var now = performance.now();
  g_frameCount++;
  if (now - g_lastFrameTime >= 1000) {
    g_fps = g_frameCount;
    g_frameCount = 0;
    g_lastFrameTime = now;
    document.getElementById('fpsDisplay').textContent = g_fps;
  }

  g_seconds = performance.now()/1000.0 - g_startTime;
  if (g_poking) {
    updatePokeAnimation();
  } else if (g_animating) {
    updateAnimationAngles();
  }
  renderScene();
  requestAnimationFrame(tick);
}

function updateAnimationAngles() {
  // Wag tail
  g_tailAngle = -20 + 15 * Math.sin(g_seconds * 4);

  // Front left and back right move together
  g_frontLeftThighAngle = 25 * Math.sin(g_seconds * 3);
  g_backRightLegAngle = 25 * Math.sin(g_seconds * 3);

  // Front right and back left move together, offset by half cycle
  g_frontRightLegAngle = 25 * Math.sin(g_seconds * 3 + Math.PI);
  g_backLeftLegAngle = 25 * Math.sin(g_seconds * 3 + Math.PI);

  g_frontLeftPawAngle = 15 * Math.sin(g_seconds * 3);
  g_frontRightPawAngle = 15 * Math.sin(g_seconds * 3 + Math.PI);

  g_backLeftPawAngle = 15 * Math.sin(g_seconds * 3 + Math.PI);
  g_backRightPawAngle = 15 * Math.sin(g_seconds * 3);

  // Head bobs up and down gently
  g_headAngle = 8 * Math.sin(g_seconds * 2);

  // Body bobs slightly
  g_bodyBob = 0.02 * Math.sin(g_seconds * 3);
}

function updatePokeAnimation() {
  var t = g_seconds - g_pokeTime;
  if (t < 3.0) {  // sit for 3 seconds
    // Back legs fold under
    g_backLeftLegAngle = -60 * Math.min(t, 1.0);
    g_backRightLegAngle = -60 * Math.min(t, 1.0);
    // Back of body drops down
    g_sitAngle = 40 * Math.min(t, 1.0);
    // Head tilts up attentively
    g_headAngle = -15;
    // Tail wags fast when sitting
    g_tailAngle = -20 + 40 * Math.sin(g_seconds * 8);
    g_sitDropY = -0.15 * Math.min(t, 1.0);
  } else {
    g_poking = false;
    g_sitAngle = 0;
    g_sitDropY = 0;
    g_headAngle = 0;
    g_backLeftLegAngle = 0;
    g_backRightLegAngle = 0;
    g_tailAngle = -20;
  }
}

function drawCube(M, color) {
  // 6 faces, 2 triangles each, 3 vertices each = 36 vertices
  // Each vertex has x, y, z
  var vertices = new Float32Array([
    // Front face
    -1,-1, 1,   1,-1, 1,   1, 1, 1,
    -1,-1, 1,   1, 1, 1,  -1, 1, 1,
    // Back face
    -1,-1,-1,  -1, 1,-1,   1, 1,-1,
    -1,-1,-1,   1, 1,-1,   1,-1,-1,
    // Top face
    -1, 1,-1,  -1, 1, 1,   1, 1, 1,
    -1, 1,-1,   1, 1, 1,   1, 1,-1,
    // Bottom face
    -1,-1,-1,   1,-1,-1,   1,-1, 1,
    -1,-1,-1,   1,-1, 1,  -1,-1, 1,
    // Right face
     1,-1,-1,   1, 1,-1,   1, 1, 1,
     1,-1,-1,   1, 1, 1,   1,-1, 1,
    // Left face
    -1,-1,-1,  -1,-1, 1,  -1, 1, 1,
    -1,-1,-1,  -1, 1, 1,  -1, 1,-1,
  ]);

  // Create and bind the buffer
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  // Get and set the a_Position attribute
  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  // 3 floats per vertex (x, y, z)
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get u_ModelMatrix location');
    return;
  }
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  var u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  var globalRotMatrix = new Matrix4();
  globalRotMatrix.setRotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMatrix.elements);

  var u_GlobalRotationY = gl.getUniformLocation(gl.program, 'u_GlobalRotationY');
  var globalRotMatrixY = new Matrix4();
  globalRotMatrixY.setRotate(g_mouseY, 1, 0, 0);
  globalRotMatrixY.rotate(g_mouseX, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotationY, false, globalRotMatrixY.elements);
  globalRotMatrix.setRotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMatrix.elements);

  var u_Color = gl.getUniformLocation(gl.program, 'u_Color');
  gl.uniform4f(u_Color, color[0], color[1], color[2], color[3]);

  // Draw the 36 vertices (12 triangles)
  gl.drawArrays(gl.TRIANGLES, 0, 36);
}

function drawCylinder(M, color, segments) {
  segments = segments || 16;
  var verts = [];
  
  for (var i = 0; i < segments; i++) {
    var angle1 = (i / segments) * 2 * Math.PI;
    var angle2 = ((i + 1) / segments) * 2 * Math.PI;
    var x1 = Math.cos(angle1), z1 = Math.sin(angle1);
    var x2 = Math.cos(angle2), z2 = Math.sin(angle2);

    // Top face triangle
    verts.push(0, 1, 0,  x1, 1, z1,  x2, 1, z2);
    // Bottom face triangle
    verts.push(0, -1, 0,  x2, -1, z2,  x1, -1, z1);
    // Side triangles
    verts.push(x1, 1, z1,  x1, -1, z1,  x2, -1, z2);
    verts.push(x1, 1, z1,  x2, -1, z2,  x2,  1, z2);
  }

  var vertices = new Float32Array(verts);
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  var u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  var globalRotMatrix = new Matrix4();
  globalRotMatrix.setRotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMatrix.elements);

  var u_GlobalRotationY = gl.getUniformLocation(gl.program, 'u_GlobalRotationY');
  var globalRotMatrixY = new Matrix4();
  globalRotMatrixY.setRotate(g_mouseY, 1, 0, 0);
  globalRotMatrixY.rotate(g_mouseX, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotationY, false, globalRotMatrixY.elements);
  globalRotMatrix.setRotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMatrix.elements);

  var u_Color = gl.getUniformLocation(gl.program, 'u_Color');
  gl.uniform4f(u_Color, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, verts.length / 3);
}
