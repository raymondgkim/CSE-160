class Triangle {
  constructor(x, y, color, size) {
    this.x = x;
    this.y = y;
    this.color = color;  // [r, g, b, a]
    this.size = size;
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    var d = this.size / 200.0;  // Convert size to WebGL coordinate scale
    drawTriangle([
      this.x,       this.y + d,
      this.x - d,   this.y - d,
      this.x + d,   this.y - d
    ]);
  }
}

function drawTriangle(vertices) {
  var vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  gl.drawArrays(gl.TRIANGLES, 0, 3);
}