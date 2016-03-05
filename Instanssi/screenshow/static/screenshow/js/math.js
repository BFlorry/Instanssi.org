var Vec3 = (function () {
    function Vec3(x, y, z) {
        this.x = x || 0;
        this.y = typeof y === "number" ? y : this.x;
        this.z = typeof z === "number" ? z : this.y;
    }
    Vec3.prototype.add = function (b) {
        return new Vec3(this.x + b.x, this.y + b.y, this.z + b.z);
    };
    Vec3.prototype.sub = function (b) {
        return new Vec3(this.x - b.x, this.y - b.y, this.z - b.z);
    };
    Vec3.prototype.div = function (b) {
        return new Vec3(this.x / b, this.y / b, this.z / b);
    };
    Vec3.prototype.dot = function (b) {
        return this.x * b.x + this.y * b.y + this.z + b.z;
    };
    Vec3.prototype.cross = function (b) {
        var x = this.x, y = this.y, z = this.z;
        return new Vec3(y * b.z - b.y * z, z * b.x - b.z * x, x * b.y - b.x * y);
    };
    Vec3.prototype.len2 = function () {
        return this.dot(this);
    };
    Vec3.prototype.len = function () {
        return Math.sqrt(this.len2());
    };
    Vec3.prototype.unit = function () {
        var len = this.len();
        if (len > 0) {
            return this.div(this.len());
        }
        return new Vec3(0);
    };
    Vec3.prototype.pow = function (b) {
        return new Vec3(Math.pow(this.x, b), Math.pow(this.y, b), Math.pow(this.z, b));
    };
    Vec3.prototype.flip = function () {
        return new Vec3(-this.x, -this.y, -this.z);
    };
    Vec3.prototype.mul = function (b) {
        var x = this.x, y = this.y, z = this.z;
        if (typeof b === "number") {
            return new Vec3(x * b, y * b, z * b);
        }
        else {
            return new Vec3(x * b.x, y * b.y, z * b.z);
        }
    };
    return Vec3;
}());
var Quat = (function () {
    function Quat(x, y, z, w) {
        if (typeof x !== "number" || typeof y !== "number" ||
            typeof z !== "number" || typeof w !== "number") {
            this.x = 0;
            this.y = 0;
            this.z = 0;
            this.w = 1;
        }
        else {
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
        }
    }
    Quat.prototype.conjugate = function () {
        return new Quat(-this.x, -this.y, -this.z, this.w);
    };
    Quat.prototype.normSquared = function () {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        return x * x + y * y + z * z + w * w;
    };
    Quat.prototype.norm = function () {
        return Math.sqrt(this.normSquared());
    };
    Quat.prototype.unit = function () {
        return this.div(this.norm());
    };
    Quat.prototype.div = function (n) {
        return new Quat(this.x / n, this.y / n, this.z / n, this.w / n);
    };
    Quat.prototype.rotate = function (v) {
        var q = this;
        return new Vec3(v.x * (q.w * q.w + q.x * q.x - q.y * q.y - q.z * q.z) +
            v.y * ((q.x * q.y + q.w * q.z) * 2.0) +
            v.z * ((q.x * q.z - q.w * q.y) * 2.0), v.x * ((q.x * q.y - q.w * q.z) * 2.0) +
            v.y * (q.w * q.w - q.x * q.x + q.y * q.y - q.z * q.z) +
            v.z * ((q.y * q.z + q.w * q.x) * 2.0), v.x * ((q.x * q.z + q.w * q.y) * 2.0) +
            v.y * ((q.y * q.z - q.w * q.x) * 2.0) +
            v.z * (q.w * q.w - q.x * q.x - q.y * q.y + q.z * q.z));
    };
    Quat.prototype.mul = function (q) {
        var x = this.x, y = this.y, z = this.z, w = this.w;
        return new Quat(w * q.x + x * q.w + y * q.z - z * q.y, w * q.y - x * q.z + y * q.w + z * q.x, w * q.z + x * q.y - y * q.x + z * q.w, w * q.w - x * q.x - y * q.y - z * q.z).unit();
    };
    Quat.fromAngleAxis = function (angle, axis) {
        var halfAngle = angle / 2;
        var sha = Math.sin(halfAngle);
        return new Quat(axis.x * sha, axis.y * sha, axis.z * sha, Math.cos(halfAngle));
    };
    return Quat;
}());
var Mat44 = (function () {
    function Mat44() {
        this.m = new Float32Array(16); // Float32Arrays initialize to 0s
    }
    Mat44.prototype.transpose = function () {
        var mat = new Mat44(), outm = mat.m;
        for (var j = 0; j < 4; j++) {
            for (var i = 0; i < 4; i++) {
                outm[i * 4 + j] = this.m[j * 4 + i];
            }
        }
        return mat;
    };
    // multiplies two 4x4 matrices together. mind the order of operations!
    Mat44.prototype.mul = function (b) {
        var mat = new Mat44(), outm = mat.m;
        var i, j, k;
        var sum;
        for (j = 0; j < 4; j++) {
            for (i = 0; i < 4; i++) {
                sum = 0;
                for (k = 0; k < 4; k++) {
                    sum += this.m[i * 4 + k] * b.m[k * 4 + j];
                }
                outm[i * 4 + j] = sum;
            }
        }
        return mat;
    };
    Mat44.prototype.mulVec3 = function (v) {
        var m = this.m;
        return new Vec3(m[0] * v.x + m[4] * v.y + m[8] * v.z + m[12] * 1, m[1] * v.x + m[5] * v.y + m[9] * v.z + m[13] * 1, m[2] * v.x + m[6] * v.y + m[10] * v.z + m[14] * 1);
    };
    Mat44.prototype.normalMatrix = function () {
        var outm = new Float32Array(9), m = this.m;
        // name the components like in mathworld
        var a11 = m[0], a12 = m[4], a13 = m[8];
        var a21 = m[1], a22 = m[5], a23 = m[9];
        var a31 = m[2], a32 = m[6], a33 = m[10];
        // determinant for the 3x3 subset
        var det = (a11 * (a22 * a33 - a23 * a32) -
            a12 * (a21 * a33 - a23 * a31) +
            a13 * (a21 * a32 - a22 * a31));
        // this is where things explode if the matrix is degenerate
        var detR = 1 / det;
        // calculate inverse and transpose
        outm[0] = detR * (a22 * a33 - a23 * a32);
        outm[3] = detR * (a23 * a31 - a21 * a33);
        outm[6] = detR * (a21 * a32 - a22 * a31);
        outm[1] = detR * (a13 * a32 - a12 * a33);
        outm[4] = detR * (a11 * a33 - a13 * a31);
        outm[7] = detR * (a12 * a31 - a11 * a32);
        outm[2] = detR * (a12 * a23 - a13 * a22);
        outm[5] = detR * (a13 * a21 - a11 * a23);
        outm[8] = detR * (a11 * a22 - a12 * a21);
        return outm;
    };
    Mat44.translate = function (vec) {
        var mat = new Mat44(), outm = mat.m;
        outm[0] = 1;
        outm[5] = 1;
        outm[10] = 1;
        outm[12] = vec.x;
        outm[13] = vec.y;
        outm[14] = vec.z;
        outm[15] = 1;
        return mat;
    };
    Mat44.scale = function (vec) {
        var mat = new Mat44(), outm = mat.m;
        outm[0] = vec.x;
        outm[5] = vec.y;
        outm[10] = vec.z;
        outm[15] = 1;
        return mat;
    };
    Mat44.rotate = function (angle, vec) {
        var x = vec.x, y = vec.y, z = vec.z;
        var C = Math.cos(angle);
        var S = Math.sin(angle);
        var R = 1.0 - C;
        var mat = new Mat44(), outm = mat.m;
        outm[0] = C + x * x * R;
        outm[1] = y * x * R + z * S;
        outm[2] = x * z * R - y * S;
        outm[4] = x * y * R - z * S;
        outm[5] = C + y * y * R;
        outm[6] = y * z * R + x * S;
        outm[8] = x * z * R + y * S;
        outm[9] = y * z * R - x * S;
        outm[10] = C + z * z * R;
        outm[15] = 1;
        return mat;
    };
    Mat44.perspective = function (yfov, aspect, near, far) {
        var f = Math.cos(yfov * 0.5) / Math.sin(yfov * 0.5);
        var mat = new Mat44(), outm = mat.m;
        outm[0] = f / aspect;
        outm[5] = f;
        outm[10] = (near + far) / (near - far);
        outm[11] = -1;
        outm[14] = (2 * near * far) / (near - far);
        return mat;
    };
    Mat44.identity = function () {
        var mat = new Mat44(), outm = mat.m;
        outm[0] = outm[5] = outm[10] = outm[15] = 1;
        return mat;
    };
    Mat44.fromQuaternion = function (q) {
        var x = q.x, y = q.y, z = q.z, w = q.w;
        var norm = q.normSquared();
        if (norm == 0) {
            return Mat44.identity();
        }
        var scale = 2.0 / norm;
        var xs = x * scale;
        var ys = y * scale;
        var zs = z * scale;
        var mat = Mat44.identity(), m = mat.m;
        m[0] = 1.0 - (ys * y + zs * z);
        m[1] = (xs * y - zs * w);
        m[2] = (xs * z + ys * w);
        m[4] = (xs * y + zs * w);
        m[5] = 1.0 - (xs * x + zs * z);
        m[6] = (ys * z - xs * w);
        m[8] = (xs * z - ys * w);
        m[9] = (ys * z + xs * w);
        m[10] = 1.0 - (xs * x + ys * y);
        return mat;
    };
    return Mat44;
}());
function assert(cond, text) {
    if (!cond) {
        console.error(text);
    }
}
function fuzzyVecAssert(val, expected, text) {
    var eps = 0.00001;
    return val.sub(expected).len() < eps;
}
function testVec3() {
    // test constructor
    var a = new Vec3(1.0);
    assert(a.x == 1.0, "x must be set correctly in constructor");
    assert(a.y == 1.0, "y must be set correctly in constructor");
    assert(a.z == 1.0, "z must be set correctly in constructor");
    var b = new Vec3(2, 3, 4);
    var c = a.add(b);
    fuzzyVecAssert(c, new Vec3(3, 4, 5), "Vec3 add");
    c = b.sub(a);
    fuzzyVecAssert(c, new Vec3(1, 2, 3), "Vec3 sub");
}
testVec3();
