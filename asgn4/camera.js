// camera.js — Camera class for Assignment 3

class Camera {
  constructor(canvas) {
    this.fov = 60.0;

    // eye: camera position
    this.eye = new Vector3([16.5, 1.0, 16.5]);
    // at: the point the camera looks at
    this.at  = new Vector3([16.5, 1.0, 15.5]);  // looking in -Z direction
    // up: world up vector
    this.up  = new Vector3([0, 1, 0]);

    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();

    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );

    this.projectionMatrix.setPerspective(
      this.fov,
      canvas.width / canvas.height,
      0.1,
      1000
    );
  }

  // Recompute viewMatrix from current eye/at/up
  updateViewMatrix() {
    this.viewMatrix.setLookAt(
      this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
      this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
      this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
    );
  }

  // Helper: return a new Vector3 = a - b
  _sub(a, b) {
    return new Vector3([
      a.elements[0] - b.elements[0],
      a.elements[1] - b.elements[1],
      a.elements[2] - b.elements[2]
    ]);
  }

  // Helper: return a new Vector3 = cross product of a and b
  _cross(a, b) {
    return new Vector3([
      a.elements[1]*b.elements[2] - a.elements[2]*b.elements[1],
      a.elements[2]*b.elements[0] - a.elements[0]*b.elements[2],
      a.elements[0]*b.elements[1] - a.elements[1]*b.elements[0]
    ]);
  }

  // Helper: normalize a Vector3 in place
  _normalize(v) {
    var len = Math.sqrt(
      v.elements[0]*v.elements[0] +
      v.elements[1]*v.elements[1] +
      v.elements[2]*v.elements[2]
    );
    if (len > 0.0001) {
      v.elements[0] /= len;
      v.elements[1] /= len;
      v.elements[2] /= len;
    }
    return v;
  }

  // Helper: scale a Vector3 in place by scalar s
  _scale(v, s) {
    v.elements[0] *= s;
    v.elements[1] *= s;
    v.elements[2] *= s;
    return v;
  }

  // Helper: add Vector3 b into a in place
  _add(a, b) {
    a.elements[0] += b.elements[0];
    a.elements[1] += b.elements[1];
    a.elements[2] += b.elements[2];
    return a;
  }

  moveForward(speed) {
    // f = at - eye
    let f = this._sub(this.at, this.eye);
    this._normalize(f);
    this._scale(f, speed);
    // eye += f;  at += f
    this._add(this.eye, f);
    this._add(this.at,  f);
    this.updateViewMatrix();
  }

  moveBackwards(speed) {
    // b = eye - at
    let b = this._sub(this.eye, this.at);
    this._normalize(b);
    this._scale(b, speed);
    this._add(this.eye, b);
    this._add(this.at,  b);
    this.updateViewMatrix();
  }

  moveLeft(speed) {
    // f = at - eye
    let f = this._sub(this.at, this.eye);
    // s = up x f
    let s = this._cross(this.up, f);
    this._normalize(s);
    this._scale(s, speed);
    this._add(this.eye, s);
    this._add(this.at,  s);
    this.updateViewMatrix();
  }

  moveRight(speed) {
    // f = at - eye
    let f = this._sub(this.at, this.eye);
    // s = f x up
    let s = this._cross(f, this.up);
    this._normalize(s);
    this._scale(s, speed);
    this._add(this.eye, s);
    this._add(this.at,  s);
    this.updateViewMatrix();
  }

  panLeft(alpha) {
    // f = at - eye
    let f = this._sub(this.at, this.eye);
    // Rotate f by alpha degrees around the up vector
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(alpha, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    let f_prime = rotationMatrix.multiplyVector3(f);
    // at = eye + f_prime
    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    this.updateViewMatrix();
  }

  panRight(alpha) {
    this.panLeft(-alpha);
  }

  // Tilt up/down — rotate around the side axis, clamped to ±70°
  tiltVertical(degrees) {
    let f    = this._sub(this.at, this.eye);
    let side = this._cross(f, this.up);
    this._normalize(side);
    let rotationMatrix = new Matrix4();
    rotationMatrix.setRotate(-degrees, side.elements[0], side.elements[1], side.elements[2]);
    let f_prime = rotationMatrix.multiplyVector3(f);

    // Clamp: don't allow looking more than 70° up or down
    var fLen = Math.sqrt(f_prime.elements[0]*f_prime.elements[0] + f_prime.elements[1]*f_prime.elements[1] + f_prime.elements[2]*f_prime.elements[2]);
    var pitch = Math.asin(f_prime.elements[1] / fLen) * 180 / Math.PI;
    if (pitch > 70 || pitch < -70) return;  // reject the tilt

    this.at.elements[0] = this.eye.elements[0] + f_prime.elements[0];
    this.at.elements[1] = this.eye.elements[1] + f_prime.elements[1];
    this.at.elements[2] = this.eye.elements[2] + f_prime.elements[2];
    this.updateViewMatrix();
  }
}
