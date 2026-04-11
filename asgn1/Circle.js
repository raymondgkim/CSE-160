class Circle {
  constructor(x, y, color, size, segments) {
    this.x = x;
    this.y = y;
    this.color = color;   // [r, g, b, a]
    this.size = size;
    this.segments = segments;
  }

  render() {
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    var r = this.size / 200.0;  // Convert size to WebGL coordinate scale
    var angleStep = (2 * Math.PI) / this.segments;

    // Draw circle as a fan of triangles from the center
    for (var i = 0; i < this.segments; i++) {
      var angle1 = i * angleStep;
      var angle2 = (i + 1) * angleStep;

      drawTriangle([
        this.x, this.y,                                           // center
        this.x + r * Math.cos(angle1), this.y + r * Math.sin(angle1),  // point 1
        this.x + r * Math.cos(angle2), this.y + r * Math.sin(angle2)   // point 2
      ]);
    }
  }
}
