// ColoredPoints.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE =
  'attribute vec4 a_Position;\n' +
  'uniform float u_Size;\n' +
  'void main() {\n' +
  '  gl_Position = a_Position;\n' +
  '  gl_PointSize = u_Size;\n' +
  '}\n';

// Fragment shader program
var FSHADER_SOURCE =
  'precision mediump float;\n' +
  'uniform vec4 u_FragColor;\n' +
  'void main() {\n' +
  '  gl_FragColor = u_FragColor;\n' +
  '}\n';

// Global variables
var gl;
var canvas;
var a_Position;
var u_FragColor;
var u_Size;

var shapesList = [];
var g_selectedShape = 'point';

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  canvas.onmousedown = function(ev) { click(ev); };
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) click(ev); };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders.');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_Size) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

function click(ev) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width  / 2) / (canvas.width  / 2);
  y = (canvas.height / 2 - (y - rect.top))  / (canvas.height / 2);

  var r = parseFloat(document.getElementById('slider_r').value) / 255.0;
  var g = parseFloat(document.getElementById('slider_g').value) / 255.0;
  var b = parseFloat(document.getElementById('slider_b').value) / 255.0;
  var size = parseFloat(document.getElementById('slider_size').value);

  if (g_selectedShape == 'point') {
    shapesList.push(new Point(x, y, [r, g, b, 1.0], size));
  } else if (g_selectedShape == 'triangle') {
    shapesList.push(new Triangle(x, y, [r, g, b, 1.0], size));
  } else if (g_selectedShape == 'circle') {
    var segs = parseInt(document.getElementById('slider_seg').value);
    shapesList.push(new Circle(x, y, [r, g, b, 1.0], size, segs));
  }

  renderAllShapes();
}

// Point class
class Point {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.size = size;
  }

  render() {
    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(a_Position, this.x, this.y, 0.0);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_Size, this.size);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

function drawTriangle(vertices) {
  var n = 3; 
  var vertexBuffer = gl.createBuffer(); // Create a buffer object
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position); // IMPORTANT: You must re-enable this!
  
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

function renderAllShapes() {
  gl.clear(gl.COLOR_BUFFER_BIT);
  for (var i = 0; i < shapesList.length; i++) {
    shapesList[i].render();
  }
}

function clearCanvas() {
  shapesList = [];
  renderAllShapes();
}

function drawPicture() {
  gl.clear(gl.COLOR_BUFFER_BIT);

  function drawRect(x1, y1, x2, y2, color) {
    gl.uniform4f(u_FragColor, color[0], color[1], color[2], color[3]);
    drawTriangle([x1, y1,  x2, y1,  x1, y2]);
    drawTriangle([x2, y1,  x2, y2,  x1, y2]);
  }

  var g = [0.35, 0.65, 0.15, 1.0];   // green
  var y = [0.95, 0.85, 0.05, 1.0];   // yellow
  var b = [0.2,  0.3,  0.5,  1.0];   // blue/grey window
  var br = [0.4, 0.2,  0.05, 1.0];   // brown wheels
  var bl = [0.0, 0.0,  0.0,  1.0];   // black (background cuts)

  // --- Main green body (big rectangle) ---
  drawRect(-0.8, -0.15, 0.8, 0.65, g);

  // --- Top-left diagonal corner ---
  gl.uniform4f(u_FragColor, bl[0], bl[1], bl[2], bl[3]);
  drawTriangle([-0.8, 0.65,  -0.6, 0.65,  -0.8, 0.45]);

  // --- Top-right diagonal corner ---
  drawTriangle([0.65, 0.65,   0.8, 0.65,   0.8, 0.45]);

  // --- Bottom-left diagonal corner ---
  drawTriangle([-0.8, -0.15,  -0.6, -0.15,  -0.8, 0.05]);

  // --- Bottom-right diagonal corner ---
  drawTriangle([0.65, -0.15,   0.8, -0.15,   0.8, 0.05]);

  // --- Blue/grey window top-left ---
  drawRect(-0.78, 0.3, -0.45, 0.62, b);

  // --- Yellow headlight (triangle pointing right) ---
  gl.uniform4f(u_FragColor, y[0], y[1], y[2], y[3]);
  drawTriangle([-0.78, 0.05,  -0.78, 0.28,  -0.45, 0.15]);

  // --- R letter ---
  // vertical bar
  drawRect(-0.35, -0.05, -0.22, 0.55, y);
  // top horizontal
  drawRect(-0.35, 0.38,   0.0,  0.55, y);
  // middle horizontal
  drawRect(-0.35, 0.22,   0.0,  0.38, y);
  // diagonal leg
  gl.uniform4f(u_FragColor, y[0], y[1], y[2], y[3]);
  drawTriangle([-0.22, 0.22,  0.0, 0.22,  0.0, -0.05]);

  // --- K letter ---
  // vertical bar
  drawRect(0.08, -0.05, 0.2, 0.55, y);
  // top diagonal arm
  gl.uniform4f(u_FragColor, y[0], y[1], y[2], y[3]);
  drawTriangle([0.2, 0.28,  0.55, 0.55,  0.2, 0.55]);
  // bottom diagonal arm
  drawTriangle([0.2, 0.28,  0.55, -0.05,  0.2, -0.05]);

  // --- Left wheel (trapezoid shape) ---
  drawRect(-0.62, -0.55, -0.25, -0.15, br);
  // corner cuts on wheel
  gl.uniform4f(u_FragColor, bl[0], bl[1], bl[2], bl[3]);
  drawTriangle([-0.62, -0.55,  -0.44, -0.55,  -0.62, -0.38]);
  drawTriangle([-0.25, -0.55,  -0.44, -0.55,  -0.25, -0.38]);

  // --- Right wheel ---
  drawRect(0.22, -0.55, 0.6, -0.15, br);
  gl.uniform4f(u_FragColor, bl[0], bl[1], bl[2], bl[3]);
  drawTriangle([0.22, -0.55,  0.41, -0.55,  0.22, -0.38]);
  drawTriangle([0.6,  -0.55,  0.41, -0.55,  0.6,  -0.38]);
}