// ============================================================
// Model.js  —  OBJ loader for CSE-160 Assignment 4
// Supports face format:  f v//vn  (vertex // normal, no UV)
// and                    f v/vt/vn  (vertex / uv / normal)
// ============================================================

var Model = function(gl, program) {
  this.gl      = gl;
  this.program = program;
  this.numVertices = 0;
  this.posBuf  = null;
  this.normBuf = null;
  this.ready   = false;
};

// Load an OBJ file at `url`.  Calls `onLoad()` when done (optional).
Model.prototype.load = function(url, onLoad) {
  var self = this;
  var xhr  = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onload = function() {
    if (xhr.status === 200 || xhr.status === 0) {
      self._parse(xhr.responseText);
      self.ready = true;
      if (typeof onLoad === 'function') onLoad();
    } else {
      console.error('Model.js: failed to load ' + url + '  status=' + xhr.status);
    }
  };
  xhr.onerror = function() {
    console.error('Model.js: network error loading ' + url);
  };
  xhr.send();
};

// ── OBJ parser ───────────────────────────────────────────────
Model.prototype._parse = function(text) {
  var lines = text.split('\n');

  var rawPos  = [];   // flat: x,y,z  (indexed from 1 in OBJ)
  var rawNorm = [];   // flat: nx,ny,nz

  var outPos  = [];   // expanded per triangle vertex
  var outNorm = [];

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (line.length === 0 || line[0] === '#') continue;

    var parts = line.split(/\s+/);
    var tag   = parts[0];

    if (tag === 'v') {
      rawPos.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (tag === 'vn') {
      rawNorm.push(parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3]));
    } else if (tag === 'f') {
      // Fan-triangulate polygon (handles tris and quads)
      // Each token is one of:  v   v/vt   v//vn   v/vt/vn
      var indices = [];
      for (var k = 1; k < parts.length; k++) {
        indices.push(this._parseFaceToken(parts[k]));
      }
      for (var k = 1; k < indices.length - 1; k++) {
        this._pushVert(outPos, outNorm, rawPos, rawNorm, indices[0]);
        this._pushVert(outPos, outNorm, rawPos, rawNorm, indices[k]);
        this._pushVert(outPos, outNorm, rawPos, rawNorm, indices[k+1]);
      }
    }
  }

  this.numVertices = outPos.length / 3;
  this._upload(new Float32Array(outPos), new Float32Array(outNorm));
  console.log('Model loaded: ' + this.numVertices + ' vertices');
};

// Parse one face token → {vi, ni}  (1-based OBJ indices)
Model.prototype._parseFaceToken = function(token) {
  var parts = token.split('/');
  var vi = parseInt(parts[0]) - 1;          // vertex index (0-based)
  var ni = parts.length >= 3 && parts[2] !== '' ? parseInt(parts[2]) - 1 : -1;
  return { vi: vi, ni: ni };
};

Model.prototype._pushVert = function(outPos, outNorm, rawPos, rawNorm, idx) {
  var vi = idx.vi * 3;
  outPos.push(rawPos[vi], rawPos[vi+1], rawPos[vi+2]);
  if (idx.ni >= 0) {
    var ni = idx.ni * 3;
    outNorm.push(rawNorm[ni], rawNorm[ni+1], rawNorm[ni+2]);
  } else {
    outNorm.push(0, 1, 0);   // fallback normal
  }
};

// Upload arrays to GPU
Model.prototype._upload = function(posArr, normArr) {
  var gl = this.gl;

  this.posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, posArr, gl.STATIC_DRAW);

  this.normBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
  gl.bufferData(gl.ARRAY_BUFFER, normArr, gl.STATIC_DRAW);
};

// ── Draw ─────────────────────────────────────────────────────
// M        : Matrix4  model transform
// color    : [r,g,b,a]
// uniforms : object with all the uniform locations from asg4.js
Model.prototype.draw = function(M, color, uniforms) {
  if (!this.ready) return;
  var gl = this.gl;

  // Positions
  gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
  var a_Position = gl.getAttribLocation(this.program, 'a_Position');
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Normals
  gl.bindBuffer(gl.ARRAY_BUFFER, this.normBuf);
  var a_Normal = gl.getAttribLocation(this.program, 'a_Normal');
  if (a_Normal >= 0) {
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);
  }

  // Disable TexCoord — model has no UVs
  var a_TexCoord = gl.getAttribLocation(this.program, 'a_TexCoord');
  if (a_TexCoord >= 0) gl.disableVertexAttribArray(a_TexCoord);

  // Model + normal matrices
  gl.uniformMatrix4fv(uniforms.u_ModelMatrix,  false, M.elements);
  var nm = new Matrix4(M); nm.invert(); nm.transpose();
  gl.uniformMatrix4fv(uniforms.u_NormalMatrix, false, nm.elements);

  // Flat colour, no texture
  gl.uniform1i(uniforms.u_UseTexture, 0);
  gl.uniform4f(uniforms.u_Color, color[0], color[1], color[2], color[3]);

  gl.drawArrays(gl.TRIANGLES, 0, this.numVertices);
};
