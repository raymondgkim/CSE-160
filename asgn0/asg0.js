// asg0.js

function main() {
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('Failed to retrieve the <canvas> element');
    return false;
  }

  // Get the rendering context for 2DCG
  var ctx = canvas.getContext('2d');

  // Set canvas background to black
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Instantiate vector v1 (z = 0)
  var v1 = new Vector3([2.25, 2.25, 0]);

  // Draw v1 in red
  drawVector(v1, "red");
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // Canvas center is the origin
  var cx = canvas.width / 2;   // 200
  var cy = canvas.height / 2;  // 200

  // Scale by 20, and flip Y (canvas Y goes down, math Y goes up)
  var x = v.elements[0] * 20;
  var y = v.elements[1] * 20;

  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.moveTo(cx, cy);                // start at center
  ctx.lineTo(cx + x, cy - y);       // flip Y axis
  ctx.stroke();
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // 1. Clear the canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Read v1 and draw in red
  var x1 = parseFloat(document.getElementById('v1x').value);
  var y1 = parseFloat(document.getElementById('v1y').value);
  var v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, "red");

  // 3. Read v2 and draw in blue
  var x2 = parseFloat(document.getElementById('v2x').value);
  var y2 = parseFloat(document.getElementById('v2y').value);
  var v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  // 1. Clear the canvas
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Draw v1 red and v2 blue
  var x1 = parseFloat(document.getElementById('v1x').value);
  var y1 = parseFloat(document.getElementById('v1y').value);
  var v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, "red");

  var x2 = parseFloat(document.getElementById('v2x').value);
  var y2 = parseFloat(document.getElementById('v2y').value);
  var v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");

  // 3. Read operation and scalar
  var op = document.getElementById('operation').value;
  var s = parseFloat(document.getElementById('scalar').value);

  // 4. Perform operation and draw result(s) in green
  if (op === 'add') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(v3, "green");
  } else if (op === 'sub') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(v3, "green");
  } else if (op === 'mul') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.mul(s);
    var v4 = new Vector3([x2, y2, 0]);
    v4.mul(s);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === 'div') {
    var v3 = new Vector3([x1, y1, 0]);
    v3.div(s);
    var v4 = new Vector3([x2, y2, 0]);
    v4.div(s);
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === 'magnitude') {
    console.log("Magnitude of v1: " + v1.magnitude());
    console.log("Magnitude of v2: " + v2.magnitude());
  } else if (op === 'normalize') {
    console.log("Magnitude of v1: " + v1.magnitude());
    console.log("Magnitude of v2: " + v2.magnitude());
    var v3 = new Vector3([x1, y1, 0]);
    v3.normalize();
    var v4 = new Vector3([x2, y2, 0]);
    v4.normalize();
    drawVector(v3, "green");
    drawVector(v4, "green");
  } else if (op === 'anglebetween') {
    console.log("Angle: " + angleBetween(v1, v2));
  } else if (op === 'area') {
    console.log("Area of the triangle: " + areaTriangle(v1, v2));
  }
}

function angleBetween(v1, v2) {
    let dot = Vector3.dot(v1, v2);
    let angle = Math.acos(dot / (v1.magnitude() * v2.magnitude()));
    return angle * (180 / Math.PI); // convert to degrees
}

function areaTriangle(v1, v2) {
    let cross = Vector3.cross(v1, v2);
    return cross.magnitude() / 2;
}