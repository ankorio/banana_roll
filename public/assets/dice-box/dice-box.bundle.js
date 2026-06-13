import * as e from "three";
//#region node_modules/cannon-es/dist/cannon-es.js
var t = class e {
	constructor(e) {
		e === void 0 && (e = [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0
		]), this.elements = e;
	}
	identity() {
		let e = this.elements;
		e[0] = 1, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 1, e[5] = 0, e[6] = 0, e[7] = 0, e[8] = 1;
	}
	setZero() {
		let e = this.elements;
		e[0] = 0, e[1] = 0, e[2] = 0, e[3] = 0, e[4] = 0, e[5] = 0, e[6] = 0, e[7] = 0, e[8] = 0;
	}
	setTrace(e) {
		let t = this.elements;
		t[0] = e.x, t[4] = e.y, t[8] = e.z;
	}
	getTrace(e) {
		e === void 0 && (e = new r());
		let t = this.elements;
		return e.x = t[0], e.y = t[4], e.z = t[8], e;
	}
	vmult(e, t) {
		t === void 0 && (t = new r());
		let n = this.elements, i = e.x, a = e.y, o = e.z;
		return t.x = n[0] * i + n[1] * a + n[2] * o, t.y = n[3] * i + n[4] * a + n[5] * o, t.z = n[6] * i + n[7] * a + n[8] * o, t;
	}
	smult(e) {
		for (let t = 0; t < this.elements.length; t++) this.elements[t] *= e;
	}
	mmult(t, n) {
		n === void 0 && (n = new e());
		let r = this.elements, i = t.elements, a = n.elements, o = r[0], s = r[1], c = r[2], l = r[3], u = r[4], d = r[5], f = r[6], p = r[7], m = r[8], h = i[0], g = i[1], _ = i[2], v = i[3], y = i[4], b = i[5], x = i[6], S = i[7], C = i[8];
		return a[0] = o * h + s * v + c * x, a[1] = o * g + s * y + c * S, a[2] = o * _ + s * b + c * C, a[3] = l * h + u * v + d * x, a[4] = l * g + u * y + d * S, a[5] = l * _ + u * b + d * C, a[6] = f * h + p * v + m * x, a[7] = f * g + p * y + m * S, a[8] = f * _ + p * b + m * C, n;
	}
	scale(t, n) {
		n === void 0 && (n = new e());
		let r = this.elements, i = n.elements;
		for (let e = 0; e !== 3; e++) i[3 * e + 0] = t.x * r[3 * e + 0], i[3 * e + 1] = t.y * r[3 * e + 1], i[3 * e + 2] = t.z * r[3 * e + 2];
		return n;
	}
	solve(e, t) {
		t === void 0 && (t = new r());
		let n = [], i, a;
		for (i = 0; i < 12; i++) n.push(0);
		for (i = 0; i < 3; i++) for (a = 0; a < 3; a++) n[i + 4 * a] = this.elements[i + 3 * a];
		n[3] = e.x, n[7] = e.y, n[11] = e.z;
		let o = 3, s = o, c, l;
		do {
			if (i = s - o, n[i + 4 * i] === 0) {
				for (a = i + 1; a < s; a++) if (n[i + 4 * a] !== 0) {
					c = 4;
					do
						l = 4 - c, n[l + 4 * i] += n[l + 4 * a];
					while (--c);
					break;
				}
			}
			if (n[i + 4 * i] !== 0) for (a = i + 1; a < s; a++) {
				let e = n[i + 4 * a] / n[i + 4 * i];
				c = 4;
				do
					l = 4 - c, n[l + 4 * a] = l <= i ? 0 : n[l + 4 * a] - n[l + 4 * i] * e;
				while (--c);
			}
		} while (--o);
		if (t.z = n[11] / n[10], t.y = (n[7] - n[6] * t.z) / n[5], t.x = (n[3] - n[2] * t.z - n[1] * t.y) / n[0], isNaN(t.x) || isNaN(t.y) || isNaN(t.z) || t.x === Infinity || t.y === Infinity || t.z === Infinity) throw `Could not solve equation! Got x=[${t.toString()}], b=[${e.toString()}], A=[${this.toString()}]`;
		return t;
	}
	e(e, t, n) {
		if (n === void 0) return this.elements[t + 3 * e];
		this.elements[t + 3 * e] = n;
	}
	copy(e) {
		for (let t = 0; t < e.elements.length; t++) this.elements[t] = e.elements[t];
		return this;
	}
	toString() {
		let e = "";
		for (let t = 0; t < 9; t++) e += this.elements[t] + ",";
		return e;
	}
	reverse(t) {
		t === void 0 && (t = new e());
		let r = n, i, a;
		for (i = 0; i < 3; i++) for (a = 0; a < 3; a++) r[i + 6 * a] = this.elements[i + 3 * a];
		r[3] = 1, r[9] = 0, r[15] = 0, r[4] = 0, r[10] = 1, r[16] = 0, r[5] = 0, r[11] = 0, r[17] = 1;
		let o = 3, s = o, c, l;
		do {
			if (i = s - o, r[i + 6 * i] === 0) {
				for (a = i + 1; a < s; a++) if (r[i + 6 * a] !== 0) {
					c = 6;
					do
						l = 6 - c, r[l + 6 * i] += r[l + 6 * a];
					while (--c);
					break;
				}
			}
			if (r[i + 6 * i] !== 0) for (a = i + 1; a < s; a++) {
				let e = r[i + 6 * a] / r[i + 6 * i];
				c = 6;
				do
					l = 6 - c, r[l + 6 * a] = l <= i ? 0 : r[l + 6 * a] - r[l + 6 * i] * e;
				while (--c);
			}
		} while (--o);
		i = 2;
		do {
			a = i - 1;
			do {
				let e = r[i + 6 * a] / r[i + 6 * i];
				c = 6;
				do
					l = 6 - c, r[l + 6 * a] = r[l + 6 * a] - r[l + 6 * i] * e;
				while (--c);
			} while (a--);
		} while (--i);
		i = 2;
		do {
			let e = 1 / r[i + 6 * i];
			c = 6;
			do
				l = 6 - c, r[l + 6 * i] = r[l + 6 * i] * e;
			while (--c);
		} while (i--);
		i = 2;
		do {
			a = 2;
			do {
				if (l = r[3 + a + 6 * i], isNaN(l) || l === Infinity) throw `Could not reverse! A=[${this.toString()}]`;
				t.e(i, a, l);
			} while (a--);
		} while (i--);
		return t;
	}
	setRotationFromQuaternion(e) {
		let t = e.x, n = e.y, r = e.z, i = e.w, a = t + t, o = n + n, s = r + r, c = t * a, l = t * o, u = t * s, d = n * o, f = n * s, p = r * s, m = i * a, h = i * o, g = i * s, _ = this.elements;
		return _[0] = 1 - (d + p), _[1] = l - g, _[2] = u + h, _[3] = l + g, _[4] = 1 - (c + p), _[5] = f - m, _[6] = u - h, _[7] = f + m, _[8] = 1 - (c + d), this;
	}
	transpose(t) {
		t === void 0 && (t = new e());
		let n = this.elements, r = t.elements, i;
		return r[0] = n[0], r[4] = n[4], r[8] = n[8], i = n[1], r[1] = n[3], r[3] = i, i = n[2], r[2] = n[6], r[6] = i, i = n[5], r[5] = n[7], r[7] = i, t;
	}
}, n = [
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0
], r = class e {
	constructor(e, t, n) {
		e === void 0 && (e = 0), t === void 0 && (t = 0), n === void 0 && (n = 0), this.x = e, this.y = t, this.z = n;
	}
	cross(t, n) {
		n === void 0 && (n = new e());
		let r = t.x, i = t.y, a = t.z, o = this.x, s = this.y, c = this.z;
		return n.x = s * a - c * i, n.y = c * r - o * a, n.z = o * i - s * r, n;
	}
	set(e, t, n) {
		return this.x = e, this.y = t, this.z = n, this;
	}
	setZero() {
		this.x = this.y = this.z = 0;
	}
	vadd(t, n) {
		if (n) n.x = t.x + this.x, n.y = t.y + this.y, n.z = t.z + this.z;
		else return new e(this.x + t.x, this.y + t.y, this.z + t.z);
	}
	vsub(t, n) {
		if (n) n.x = this.x - t.x, n.y = this.y - t.y, n.z = this.z - t.z;
		else return new e(this.x - t.x, this.y - t.y, this.z - t.z);
	}
	crossmat() {
		return new t([
			0,
			-this.z,
			this.y,
			this.z,
			0,
			-this.x,
			-this.y,
			this.x,
			0
		]);
	}
	normalize() {
		let e = this.x, t = this.y, n = this.z, r = Math.sqrt(e * e + t * t + n * n);
		if (r > 0) {
			let e = 1 / r;
			this.x *= e, this.y *= e, this.z *= e;
		} else this.x = 0, this.y = 0, this.z = 0;
		return r;
	}
	unit(t) {
		t === void 0 && (t = new e());
		let n = this.x, r = this.y, i = this.z, a = Math.sqrt(n * n + r * r + i * i);
		return a > 0 ? (a = 1 / a, t.x = n * a, t.y = r * a, t.z = i * a) : (t.x = 1, t.y = 0, t.z = 0), t;
	}
	length() {
		let e = this.x, t = this.y, n = this.z;
		return Math.sqrt(e * e + t * t + n * n);
	}
	lengthSquared() {
		return this.dot(this);
	}
	distanceTo(e) {
		let t = this.x, n = this.y, r = this.z, i = e.x, a = e.y, o = e.z;
		return Math.sqrt((i - t) * (i - t) + (a - n) * (a - n) + (o - r) * (o - r));
	}
	distanceSquared(e) {
		let t = this.x, n = this.y, r = this.z, i = e.x, a = e.y, o = e.z;
		return (i - t) * (i - t) + (a - n) * (a - n) + (o - r) * (o - r);
	}
	scale(t, n) {
		n === void 0 && (n = new e());
		let r = this.x, i = this.y, a = this.z;
		return n.x = t * r, n.y = t * i, n.z = t * a, n;
	}
	vmul(t, n) {
		return n === void 0 && (n = new e()), n.x = t.x * this.x, n.y = t.y * this.y, n.z = t.z * this.z, n;
	}
	addScaledVector(t, n, r) {
		return r === void 0 && (r = new e()), r.x = this.x + t * n.x, r.y = this.y + t * n.y, r.z = this.z + t * n.z, r;
	}
	dot(e) {
		return this.x * e.x + this.y * e.y + this.z * e.z;
	}
	isZero() {
		return this.x === 0 && this.y === 0 && this.z === 0;
	}
	negate(t) {
		return t === void 0 && (t = new e()), t.x = -this.x, t.y = -this.y, t.z = -this.z, t;
	}
	tangents(e, t) {
		let n = this.length();
		if (n > 0) {
			let r = i, o = 1 / n;
			r.set(this.x * o, this.y * o, this.z * o);
			let s = a;
			Math.abs(r.x) < .9 ? (s.set(1, 0, 0), r.cross(s, e)) : (s.set(0, 1, 0), r.cross(s, e)), r.cross(e, t);
		} else e.set(1, 0, 0), t.set(0, 1, 0);
	}
	toString() {
		return `${this.x},${this.y},${this.z}`;
	}
	toArray() {
		return [
			this.x,
			this.y,
			this.z
		];
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this;
	}
	lerp(e, t, n) {
		let r = this.x, i = this.y, a = this.z;
		n.x = r + (e.x - r) * t, n.y = i + (e.y - i) * t, n.z = a + (e.z - a) * t;
	}
	almostEquals(e, t) {
		return t === void 0 && (t = 1e-6), !(Math.abs(this.x - e.x) > t || Math.abs(this.y - e.y) > t || Math.abs(this.z - e.z) > t);
	}
	almostZero(e) {
		return e === void 0 && (e = 1e-6), !(Math.abs(this.x) > e || Math.abs(this.y) > e || Math.abs(this.z) > e);
	}
	isAntiparallelTo(e, t) {
		return this.negate(o), o.almostEquals(e, t);
	}
	clone() {
		return new e(this.x, this.y, this.z);
	}
};
r.ZERO = new r(0, 0, 0), r.UNIT_X = new r(1, 0, 0), r.UNIT_Y = new r(0, 1, 0), r.UNIT_Z = new r(0, 0, 1);
var i = new r(), a = new r(), o = new r(), s = class e {
	constructor(e) {
		e === void 0 && (e = {}), this.lowerBound = new r(), this.upperBound = new r(), e.lowerBound && this.lowerBound.copy(e.lowerBound), e.upperBound && this.upperBound.copy(e.upperBound);
	}
	setFromPoints(e, t, n, r) {
		let i = this.lowerBound, a = this.upperBound, o = n;
		i.copy(e[0]), o && o.vmult(i, i), a.copy(i);
		for (let t = 1; t < e.length; t++) {
			let n = e[t];
			o && (o.vmult(n, c), n = c), n.x > a.x && (a.x = n.x), n.x < i.x && (i.x = n.x), n.y > a.y && (a.y = n.y), n.y < i.y && (i.y = n.y), n.z > a.z && (a.z = n.z), n.z < i.z && (i.z = n.z);
		}
		return t && (t.vadd(i, i), t.vadd(a, a)), r && (i.x -= r, i.y -= r, i.z -= r, a.x += r, a.y += r, a.z += r), this;
	}
	copy(e) {
		return this.lowerBound.copy(e.lowerBound), this.upperBound.copy(e.upperBound), this;
	}
	clone() {
		return new e().copy(this);
	}
	extend(e) {
		this.lowerBound.x = Math.min(this.lowerBound.x, e.lowerBound.x), this.upperBound.x = Math.max(this.upperBound.x, e.upperBound.x), this.lowerBound.y = Math.min(this.lowerBound.y, e.lowerBound.y), this.upperBound.y = Math.max(this.upperBound.y, e.upperBound.y), this.lowerBound.z = Math.min(this.lowerBound.z, e.lowerBound.z), this.upperBound.z = Math.max(this.upperBound.z, e.upperBound.z);
	}
	overlaps(e) {
		let t = this.lowerBound, n = this.upperBound, r = e.lowerBound, i = e.upperBound, a = r.x <= n.x && n.x <= i.x || t.x <= i.x && i.x <= n.x, o = r.y <= n.y && n.y <= i.y || t.y <= i.y && i.y <= n.y, s = r.z <= n.z && n.z <= i.z || t.z <= i.z && i.z <= n.z;
		return a && o && s;
	}
	volume() {
		let e = this.lowerBound, t = this.upperBound;
		return (t.x - e.x) * (t.y - e.y) * (t.z - e.z);
	}
	contains(e) {
		let t = this.lowerBound, n = this.upperBound, r = e.lowerBound, i = e.upperBound;
		return t.x <= r.x && n.x >= i.x && t.y <= r.y && n.y >= i.y && t.z <= r.z && n.z >= i.z;
	}
	getCorners(e, t, n, r, i, a, o, s) {
		let c = this.lowerBound, l = this.upperBound;
		e.copy(c), t.set(l.x, c.y, c.z), n.set(l.x, l.y, c.z), r.set(c.x, l.y, l.z), i.set(l.x, c.y, l.z), a.set(c.x, l.y, c.z), o.set(c.x, c.y, l.z), s.copy(l);
	}
	toLocalFrame(e, t) {
		let n = l, r = n[0], i = n[1], a = n[2], o = n[3], s = n[4], c = n[5], u = n[6], d = n[7];
		this.getCorners(r, i, a, o, s, c, u, d);
		for (let t = 0; t !== 8; t++) {
			let r = n[t];
			e.pointToLocal(r, r);
		}
		return t.setFromPoints(n);
	}
	toWorldFrame(e, t) {
		let n = l, r = n[0], i = n[1], a = n[2], o = n[3], s = n[4], c = n[5], u = n[6], d = n[7];
		this.getCorners(r, i, a, o, s, c, u, d);
		for (let t = 0; t !== 8; t++) {
			let r = n[t];
			e.pointToWorld(r, r);
		}
		return t.setFromPoints(n);
	}
	overlapsRay(e) {
		let { direction: t, from: n } = e, r = 1 / t.x, i = 1 / t.y, a = 1 / t.z, o = (this.lowerBound.x - n.x) * r, s = (this.upperBound.x - n.x) * r, c = (this.lowerBound.y - n.y) * i, l = (this.upperBound.y - n.y) * i, u = (this.lowerBound.z - n.z) * a, d = (this.upperBound.z - n.z) * a, f = Math.max(Math.max(Math.min(o, s), Math.min(c, l)), Math.min(u, d)), p = Math.min(Math.min(Math.max(o, s), Math.max(c, l)), Math.max(u, d));
		return !(p < 0 || f > p);
	}
}, c = new r(), l = [
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r()
], u = class {
	constructor() {
		this.matrix = [];
	}
	get(e, t) {
		let { index: n } = e, { index: r } = t;
		if (r > n) {
			let e = r;
			r = n, n = e;
		}
		return this.matrix[(n * (n + 1) >> 1) + r - 1];
	}
	set(e, t, n) {
		let { index: r } = e, { index: i } = t;
		if (i > r) {
			let e = i;
			i = r, r = e;
		}
		this.matrix[(r * (r + 1) >> 1) + i - 1] = +!!n;
	}
	reset() {
		for (let e = 0, t = this.matrix.length; e !== t; e++) this.matrix[e] = 0;
	}
	setNumObjects(e) {
		this.matrix.length = e * (e - 1) >> 1;
	}
}, d = class {
	addEventListener(e, t) {
		this._listeners === void 0 && (this._listeners = {});
		let n = this._listeners;
		return n[e] === void 0 && (n[e] = []), n[e].includes(t) || n[e].push(t), this;
	}
	hasEventListener(e, t) {
		if (this._listeners === void 0) return !1;
		let n = this._listeners;
		return !!(n[e] !== void 0 && n[e].includes(t));
	}
	hasAnyEventListener(e) {
		return this._listeners === void 0 ? !1 : this._listeners[e] !== void 0;
	}
	removeEventListener(e, t) {
		if (this._listeners === void 0) return this;
		let n = this._listeners;
		if (n[e] === void 0) return this;
		let r = n[e].indexOf(t);
		return r !== -1 && n[e].splice(r, 1), this;
	}
	dispatchEvent(e) {
		if (this._listeners === void 0) return this;
		let t = this._listeners[e.type];
		if (t !== void 0) {
			e.target = this;
			for (let n = 0, r = t.length; n < r; n++) t[n].call(this, e);
		}
		return this;
	}
}, f = class e {
	constructor(e, t, n, r) {
		e === void 0 && (e = 0), t === void 0 && (t = 0), n === void 0 && (n = 0), r === void 0 && (r = 1), this.x = e, this.y = t, this.z = n, this.w = r;
	}
	set(e, t, n, r) {
		return this.x = e, this.y = t, this.z = n, this.w = r, this;
	}
	toString() {
		return `${this.x},${this.y},${this.z},${this.w}`;
	}
	toArray() {
		return [
			this.x,
			this.y,
			this.z,
			this.w
		];
	}
	setFromAxisAngle(e, t) {
		let n = Math.sin(t * .5);
		return this.x = e.x * n, this.y = e.y * n, this.z = e.z * n, this.w = Math.cos(t * .5), this;
	}
	toAxisAngle(e) {
		e === void 0 && (e = new r()), this.normalize();
		let t = 2 * Math.acos(this.w), n = Math.sqrt(1 - this.w * this.w);
		return n < .001 ? (e.x = this.x, e.y = this.y, e.z = this.z) : (e.x = this.x / n, e.y = this.y / n, e.z = this.z / n), [e, t];
	}
	setFromVectors(e, t) {
		if (e.isAntiparallelTo(t)) {
			let t = p, n = m;
			e.tangents(t, n), this.setFromAxisAngle(t, Math.PI);
		} else {
			let n = e.cross(t);
			this.x = n.x, this.y = n.y, this.z = n.z, this.w = Math.sqrt(e.length() ** 2 * t.length() ** 2) + e.dot(t), this.normalize();
		}
		return this;
	}
	mult(t, n) {
		n === void 0 && (n = new e());
		let r = this.x, i = this.y, a = this.z, o = this.w, s = t.x, c = t.y, l = t.z, u = t.w;
		return n.x = r * u + o * s + i * l - a * c, n.y = i * u + o * c + a * s - r * l, n.z = a * u + o * l + r * c - i * s, n.w = o * u - r * s - i * c - a * l, n;
	}
	inverse(t) {
		t === void 0 && (t = new e());
		let n = this.x, r = this.y, i = this.z, a = this.w;
		this.conjugate(t);
		let o = 1 / (n * n + r * r + i * i + a * a);
		return t.x *= o, t.y *= o, t.z *= o, t.w *= o, t;
	}
	conjugate(t) {
		return t === void 0 && (t = new e()), t.x = -this.x, t.y = -this.y, t.z = -this.z, t.w = this.w, t;
	}
	normalize() {
		let e = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
		return e === 0 ? (this.x = 0, this.y = 0, this.z = 0, this.w = 0) : (e = 1 / e, this.x *= e, this.y *= e, this.z *= e, this.w *= e), this;
	}
	normalizeFast() {
		let e = (3 - (this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w)) / 2;
		return e === 0 ? (this.x = 0, this.y = 0, this.z = 0, this.w = 0) : (this.x *= e, this.y *= e, this.z *= e, this.w *= e), this;
	}
	vmult(e, t) {
		t === void 0 && (t = new r());
		let n = e.x, i = e.y, a = e.z, o = this.x, s = this.y, c = this.z, l = this.w, u = l * n + s * a - c * i, d = l * i + c * n - o * a, f = l * a + o * i - s * n, p = -o * n - s * i - c * a;
		return t.x = u * l + p * -o + d * -c - f * -s, t.y = d * l + p * -s + f * -o - u * -c, t.z = f * l + p * -c + u * -s - d * -o, t;
	}
	copy(e) {
		return this.x = e.x, this.y = e.y, this.z = e.z, this.w = e.w, this;
	}
	toEuler(e, t) {
		t === void 0 && (t = "YZX");
		let n, r, i, a = this.x, o = this.y, s = this.z, c = this.w;
		switch (t) {
			case "YZX":
				let e = a * o + s * c;
				if (e > .499 && (n = 2 * Math.atan2(a, c), r = Math.PI / 2, i = 0), e < -.499 && (n = -2 * Math.atan2(a, c), r = -Math.PI / 2, i = 0), n === void 0) {
					let t = a * a, l = o * o, u = s * s;
					n = Math.atan2(2 * o * c - 2 * a * s, 1 - 2 * l - 2 * u), r = Math.asin(2 * e), i = Math.atan2(2 * a * c - 2 * o * s, 1 - 2 * t - 2 * u);
				}
				break;
			default: throw Error(`Euler order ${t} not supported yet.`);
		}
		e.y = n, e.z = r, e.x = i;
	}
	setFromEuler(e, t, n, r) {
		r === void 0 && (r = "XYZ");
		let i = Math.cos(e / 2), a = Math.cos(t / 2), o = Math.cos(n / 2), s = Math.sin(e / 2), c = Math.sin(t / 2), l = Math.sin(n / 2);
		return r === "XYZ" ? (this.x = s * a * o + i * c * l, this.y = i * c * o - s * a * l, this.z = i * a * l + s * c * o, this.w = i * a * o - s * c * l) : r === "YXZ" ? (this.x = s * a * o + i * c * l, this.y = i * c * o - s * a * l, this.z = i * a * l - s * c * o, this.w = i * a * o + s * c * l) : r === "ZXY" ? (this.x = s * a * o - i * c * l, this.y = i * c * o + s * a * l, this.z = i * a * l + s * c * o, this.w = i * a * o - s * c * l) : r === "ZYX" ? (this.x = s * a * o - i * c * l, this.y = i * c * o + s * a * l, this.z = i * a * l - s * c * o, this.w = i * a * o + s * c * l) : r === "YZX" ? (this.x = s * a * o + i * c * l, this.y = i * c * o + s * a * l, this.z = i * a * l - s * c * o, this.w = i * a * o - s * c * l) : r === "XZY" && (this.x = s * a * o - i * c * l, this.y = i * c * o - s * a * l, this.z = i * a * l + s * c * o, this.w = i * a * o + s * c * l), this;
	}
	clone() {
		return new e(this.x, this.y, this.z, this.w);
	}
	slerp(t, n, r) {
		r === void 0 && (r = new e());
		let i = this.x, a = this.y, o = this.z, s = this.w, c = t.x, l = t.y, u = t.z, d = t.w, f, p, m, h, g;
		return p = i * c + a * l + o * u + s * d, p < 0 && (p = -p, c = -c, l = -l, u = -u, d = -d), 1 - p > 1e-6 ? (f = Math.acos(p), m = Math.sin(f), h = Math.sin((1 - n) * f) / m, g = Math.sin(n * f) / m) : (h = 1 - n, g = n), r.x = h * i + g * c, r.y = h * a + g * l, r.z = h * o + g * u, r.w = h * s + g * d, r;
	}
	integrate(t, n, r, i) {
		i === void 0 && (i = new e());
		let a = t.x * r.x, o = t.y * r.y, s = t.z * r.z, c = this.x, l = this.y, u = this.z, d = this.w, f = n * .5;
		return i.x += f * (a * d + o * u - s * l), i.y += f * (o * d + s * c - a * u), i.z += f * (s * d + a * l - o * c), i.w += f * (-a * c - o * l - s * u), i;
	}
}, p = new r(), m = new r(), h = {
	SPHERE: 1,
	PLANE: 2,
	BOX: 4,
	COMPOUND: 8,
	CONVEXPOLYHEDRON: 16,
	HEIGHTFIELD: 32,
	PARTICLE: 64,
	CYLINDER: 128,
	TRIMESH: 256
}, g = class e {
	constructor(t) {
		t === void 0 && (t = {}), this.id = e.idCounter++, this.type = t.type || 0, this.boundingSphereRadius = 0, this.collisionResponse = t.collisionResponse ? t.collisionResponse : !0, this.collisionFilterGroup = t.collisionFilterGroup === void 0 ? 1 : t.collisionFilterGroup, this.collisionFilterMask = t.collisionFilterMask === void 0 ? -1 : t.collisionFilterMask, this.material = t.material ? t.material : null, this.body = null;
	}
	updateBoundingSphereRadius() {
		throw `computeBoundingSphereRadius() not implemented for shape type ${this.type}`;
	}
	volume() {
		throw `volume() not implemented for shape type ${this.type}`;
	}
	calculateLocalInertia(e, t) {
		throw `calculateLocalInertia() not implemented for shape type ${this.type}`;
	}
	calculateWorldAABB(e, t, n, r) {
		throw `calculateWorldAABB() not implemented for shape type ${this.type}`;
	}
};
g.idCounter = 0, g.types = h;
var _ = class e {
	constructor(e) {
		e === void 0 && (e = {}), this.position = new r(), this.quaternion = new f(), e.position && this.position.copy(e.position), e.quaternion && this.quaternion.copy(e.quaternion);
	}
	pointToLocal(t, n) {
		return e.pointToLocalFrame(this.position, this.quaternion, t, n);
	}
	pointToWorld(t, n) {
		return e.pointToWorldFrame(this.position, this.quaternion, t, n);
	}
	vectorToWorldFrame(e, t) {
		return t === void 0 && (t = new r()), this.quaternion.vmult(e, t), t;
	}
	static pointToLocalFrame(e, t, n, i) {
		return i === void 0 && (i = new r()), n.vsub(e, i), t.conjugate(v), v.vmult(i, i), i;
	}
	static pointToWorldFrame(e, t, n, i) {
		return i === void 0 && (i = new r()), t.vmult(n, i), i.vadd(e, i), i;
	}
	static vectorToWorldFrame(e, t, n) {
		return n === void 0 && (n = new r()), e.vmult(t, n), n;
	}
	static vectorToLocalFrame(e, t, n, i) {
		return i === void 0 && (i = new r()), t.w *= -1, t.vmult(n, i), t.w *= -1, i;
	}
}, v = new f(), y = class e extends g {
	constructor(e) {
		e === void 0 && (e = {});
		let { vertices: t = [], faces: n = [], normals: r = [], axes: i, boundingSphereRadius: a } = e;
		super({ type: g.types.CONVEXPOLYHEDRON }), this.vertices = t, this.faces = n, this.faceNormals = r, this.faceNormals.length === 0 && this.computeNormals(), a ? this.boundingSphereRadius = a : this.updateBoundingSphereRadius(), this.worldVertices = [], this.worldVerticesNeedsUpdate = !0, this.worldFaceNormals = [], this.worldFaceNormalsNeedsUpdate = !0, this.uniqueAxes = i ? i.slice() : null, this.uniqueEdges = [], this.computeEdges();
	}
	computeEdges() {
		let e = this.faces, t = this.vertices, n = this.uniqueEdges;
		n.length = 0;
		let i = new r();
		for (let r = 0; r !== e.length; r++) {
			let a = e[r], o = a.length;
			for (let e = 0; e !== o; e++) {
				let r = (e + 1) % o;
				t[a[e]].vsub(t[a[r]], i), i.normalize();
				let s = !1;
				for (let e = 0; e !== n.length; e++) if (n[e].almostEquals(i) || n[e].almostEquals(i)) {
					s = !0;
					break;
				}
				s || n.push(i.clone());
			}
		}
	}
	computeNormals() {
		this.faceNormals.length = this.faces.length;
		for (let e = 0; e < this.faces.length; e++) {
			for (let t = 0; t < this.faces[e].length; t++) if (!this.vertices[this.faces[e][t]]) throw Error(`Vertex ${this.faces[e][t]} not found!`);
			let t = this.faceNormals[e] || new r();
			this.getFaceNormal(e, t), t.negate(t), this.faceNormals[e] = t;
			let n = this.vertices[this.faces[e][0]];
			if (t.dot(n) < 0) {
				console.error(`.faceNormals[${e}] = Vec3(${t.toString()}) looks like it points into the shape? The vertices follow. Make sure they are ordered CCW around the normal, using the right hand rule.`);
				for (let t = 0; t < this.faces[e].length; t++) console.warn(`.vertices[${this.faces[e][t]}] = Vec3(${this.vertices[this.faces[e][t]].toString()})`);
			}
		}
	}
	getFaceNormal(t, n) {
		let r = this.faces[t], i = this.vertices[r[0]], a = this.vertices[r[1]], o = this.vertices[r[2]];
		e.computeNormal(i, a, o, n);
	}
	static computeNormal(e, t, n, i) {
		let a = new r(), o = new r();
		t.vsub(e, o), n.vsub(t, a), a.cross(o, i), i.isZero() || i.normalize();
	}
	clipAgainstHull(e, t, n, i, a, o, s, c, l) {
		let u = new r(), d = -1, f = -Number.MAX_VALUE;
		for (let e = 0; e < n.faces.length; e++) {
			u.copy(n.faceNormals[e]), a.vmult(u, u);
			let t = u.dot(o);
			t > f && (f = t, d = e);
		}
		let p = [];
		for (let e = 0; e < n.faces[d].length; e++) {
			let t = n.vertices[n.faces[d][e]], o = new r();
			o.copy(t), a.vmult(o, o), i.vadd(o, o), p.push(o);
		}
		d >= 0 && this.clipFaceAgainstHull(o, e, t, p, s, c, l);
	}
	findSeparatingAxis(e, t, n, i, a, o, s, c) {
		let l = new r(), u = new r(), d = new r(), f = new r(), p = new r(), m = new r(), h = Number.MAX_VALUE, g = this;
		if (g.uniqueAxes) for (let r = 0; r !== g.uniqueAxes.length; r++) {
			n.vmult(g.uniqueAxes[r], l);
			let s = g.testSepAxis(l, e, t, n, i, a);
			if (s === !1) return !1;
			s < h && (h = s, o.copy(l));
		}
		else {
			let r = s ? s.length : g.faces.length;
			for (let c = 0; c < r; c++) {
				let r = s ? s[c] : c;
				l.copy(g.faceNormals[r]), n.vmult(l, l);
				let u = g.testSepAxis(l, e, t, n, i, a);
				if (u === !1) return !1;
				u < h && (h = u, o.copy(l));
			}
		}
		if (e.uniqueAxes) for (let r = 0; r !== e.uniqueAxes.length; r++) {
			a.vmult(e.uniqueAxes[r], u);
			let s = g.testSepAxis(u, e, t, n, i, a);
			if (s === !1) return !1;
			s < h && (h = s, o.copy(u));
		}
		else {
			let r = c ? c.length : e.faces.length;
			for (let s = 0; s < r; s++) {
				let r = c ? c[s] : s;
				u.copy(e.faceNormals[r]), a.vmult(u, u);
				let l = g.testSepAxis(u, e, t, n, i, a);
				if (l === !1) return !1;
				l < h && (h = l, o.copy(u));
			}
		}
		for (let r = 0; r !== g.uniqueEdges.length; r++) {
			n.vmult(g.uniqueEdges[r], f);
			for (let r = 0; r !== e.uniqueEdges.length; r++) if (a.vmult(e.uniqueEdges[r], p), f.cross(p, m), !m.almostZero()) {
				m.normalize();
				let r = g.testSepAxis(m, e, t, n, i, a);
				if (r === !1) return !1;
				r < h && (h = r, o.copy(m));
			}
		}
		return i.vsub(t, d), d.dot(o) > 0 && o.negate(o), !0;
	}
	testSepAxis(t, n, r, i, a, o) {
		let s = this;
		e.project(s, t, r, i, b), e.project(n, t, a, o, x);
		let c = b[0], l = b[1], u = x[0], d = x[1];
		if (c < d || u < l) return !1;
		let f = c - d, p = u - l;
		return f < p ? f : p;
	}
	calculateLocalInertia(e, t) {
		let n = new r(), i = new r();
		this.computeLocalAABB(i, n);
		let a = n.x - i.x, o = n.y - i.y, s = n.z - i.z;
		t.x = 1 / 12 * e * (2 * o * 2 * o + 2 * s * 2 * s), t.y = 1 / 12 * e * (2 * a * 2 * a + 2 * s * 2 * s), t.z = 1 / 12 * e * (2 * o * 2 * o + 2 * a * 2 * a);
	}
	getPlaneConstantOfFace(e) {
		let t = this.faces[e], n = this.faceNormals[e], r = this.vertices[t[0]];
		return -n.dot(r);
	}
	clipFaceAgainstHull(e, t, n, i, a, o, s) {
		let c = new r(), l = new r(), u = new r(), d = new r(), f = new r(), p = new r(), m = new r(), h = new r(), g = this, _ = [], v = i, y = _, b = -1, x = Number.MAX_VALUE;
		for (let t = 0; t < g.faces.length; t++) {
			c.copy(g.faceNormals[t]), n.vmult(c, c);
			let r = c.dot(e);
			r < x && (x = r, b = t);
		}
		if (b < 0) return;
		let S = g.faces[b];
		S.connectedFaces = [];
		for (let e = 0; e < g.faces.length; e++) for (let t = 0; t < g.faces[e].length; t++) S.indexOf(g.faces[e][t]) !== -1 && e !== b && S.connectedFaces.indexOf(e) === -1 && S.connectedFaces.push(e);
		let C = S.length;
		for (let e = 0; e < C; e++) {
			let r = g.vertices[S[e]], i = g.vertices[S[(e + 1) % C]];
			r.vsub(i, l), u.copy(l), n.vmult(u, u), t.vadd(u, u), d.copy(this.faceNormals[b]), n.vmult(d, d), t.vadd(d, d), u.cross(d, f), f.negate(f), p.copy(r), n.vmult(p, p), t.vadd(p, p);
			let a = S.connectedFaces[e];
			m.copy(this.faceNormals[a]);
			let o = this.getPlaneConstantOfFace(a);
			h.copy(m), n.vmult(h, h);
			let s = o - h.dot(t);
			for (this.clipFaceAgainstPlane(v, y, h, s); v.length;) v.shift();
			for (; y.length;) v.push(y.shift());
		}
		m.copy(this.faceNormals[b]);
		let w = this.getPlaneConstantOfFace(b);
		h.copy(m), n.vmult(h, h);
		let T = w - h.dot(t);
		for (let e = 0; e < v.length; e++) {
			let t = h.dot(v[e]) + T;
			if (t <= a && (console.log(`clamped: depth=${t} to minDist=${a}`), t = a), t <= o) {
				let n = v[e];
				if (t <= 1e-6) {
					let e = {
						point: n,
						normal: h,
						depth: t
					};
					s.push(e);
				}
			}
		}
	}
	clipFaceAgainstPlane(e, t, n, i) {
		let a, o, s = e.length;
		if (s < 2) return t;
		let c = e[e.length - 1], l = e[0];
		a = n.dot(c) + i;
		for (let u = 0; u < s; u++) {
			if (l = e[u], o = n.dot(l) + i, a < 0) if (o < 0) {
				let e = new r();
				e.copy(l), t.push(e);
			} else {
				let e = new r();
				c.lerp(l, a / (a - o), e), t.push(e);
			}
			else if (o < 0) {
				let e = new r();
				c.lerp(l, a / (a - o), e), t.push(e), t.push(l);
			}
			c = l, a = o;
		}
		return t;
	}
	computeWorldVertices(e, t) {
		for (; this.worldVertices.length < this.vertices.length;) this.worldVertices.push(new r());
		let n = this.vertices, i = this.worldVertices;
		for (let r = 0; r !== this.vertices.length; r++) t.vmult(n[r], i[r]), e.vadd(i[r], i[r]);
		this.worldVerticesNeedsUpdate = !1;
	}
	computeLocalAABB(e, t) {
		let n = this.vertices;
		e.set(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE), t.set(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);
		for (let r = 0; r < this.vertices.length; r++) {
			let i = n[r];
			i.x < e.x ? e.x = i.x : i.x > t.x && (t.x = i.x), i.y < e.y ? e.y = i.y : i.y > t.y && (t.y = i.y), i.z < e.z ? e.z = i.z : i.z > t.z && (t.z = i.z);
		}
	}
	computeWorldFaceNormals(e) {
		let t = this.faceNormals.length;
		for (; this.worldFaceNormals.length < t;) this.worldFaceNormals.push(new r());
		let n = this.faceNormals, i = this.worldFaceNormals;
		for (let r = 0; r !== t; r++) e.vmult(n[r], i[r]);
		this.worldFaceNormalsNeedsUpdate = !1;
	}
	updateBoundingSphereRadius() {
		let e = 0, t = this.vertices;
		for (let n = 0; n !== t.length; n++) {
			let r = t[n].lengthSquared();
			r > e && (e = r);
		}
		this.boundingSphereRadius = Math.sqrt(e);
	}
	calculateWorldAABB(e, t, n, i) {
		let a = this.vertices, o, s, c, l, u, d, f = new r();
		for (let n = 0; n < a.length; n++) {
			f.copy(a[n]), t.vmult(f, f), e.vadd(f, f);
			let r = f;
			(o === void 0 || r.x < o) && (o = r.x), (l === void 0 || r.x > l) && (l = r.x), (s === void 0 || r.y < s) && (s = r.y), (u === void 0 || r.y > u) && (u = r.y), (c === void 0 || r.z < c) && (c = r.z), (d === void 0 || r.z > d) && (d = r.z);
		}
		n.set(o, s, c), i.set(l, u, d);
	}
	volume() {
		return 4 * Math.PI * this.boundingSphereRadius / 3;
	}
	getAveragePointLocal(e) {
		e === void 0 && (e = new r());
		let t = this.vertices;
		for (let n = 0; n < t.length; n++) e.vadd(t[n], e);
		return e.scale(1 / t.length, e), e;
	}
	transformAllPoints(e, t) {
		let n = this.vertices.length, r = this.vertices;
		if (t) {
			for (let e = 0; e < n; e++) {
				let n = r[e];
				t.vmult(n, n);
			}
			for (let e = 0; e < this.faceNormals.length; e++) {
				let n = this.faceNormals[e];
				t.vmult(n, n);
			}
		}
		if (e) for (let t = 0; t < n; t++) {
			let n = r[t];
			n.vadd(e, n);
		}
	}
	pointIsInside(e) {
		let t = this.vertices, n = this.faces, i = this.faceNormals, a = new r();
		this.getAveragePointLocal(a);
		for (let o = 0; o < this.faces.length; o++) {
			let s = i[o], c = t[n[o][0]], l = new r();
			e.vsub(c, l);
			let u = s.dot(l), d = new r();
			a.vsub(c, d);
			let f = s.dot(d);
			if (u < 0 && f > 0 || u > 0 && f < 0) return !1;
		}
		return -1;
	}
	static project(e, t, n, r, i) {
		let a = e.vertices.length, o = S, s = 0, c = 0, l = C, u = e.vertices;
		l.setZero(), _.vectorToLocalFrame(n, r, t, o), _.pointToLocalFrame(n, r, l, l);
		let d = l.dot(o);
		c = s = u[0].dot(o);
		for (let e = 1; e < a; e++) {
			let t = u[e].dot(o);
			t > s && (s = t), t < c && (c = t);
		}
		if (c -= d, s -= d, c > s) {
			let e = c;
			c = s, s = e;
		}
		i[0] = s, i[1] = c;
	}
}, b = [], x = [];
new r();
var S = new r(), C = new r(), w = class e extends g {
	constructor(e) {
		super({ type: g.types.BOX }), this.halfExtents = e, this.convexPolyhedronRepresentation = null, this.updateConvexPolyhedronRepresentation(), this.updateBoundingSphereRadius();
	}
	updateConvexPolyhedronRepresentation() {
		let e = this.halfExtents.x, t = this.halfExtents.y, n = this.halfExtents.z, i = r, a = new y({
			vertices: [
				new i(-e, -t, -n),
				new i(e, -t, -n),
				new i(e, t, -n),
				new i(-e, t, -n),
				new i(-e, -t, n),
				new i(e, -t, n),
				new i(e, t, n),
				new i(-e, t, n)
			],
			faces: [
				[
					3,
					2,
					1,
					0
				],
				[
					4,
					5,
					6,
					7
				],
				[
					5,
					4,
					0,
					1
				],
				[
					2,
					3,
					7,
					6
				],
				[
					0,
					4,
					7,
					3
				],
				[
					1,
					2,
					6,
					5
				]
			],
			axes: [
				new i(0, 0, 1),
				new i(0, 1, 0),
				new i(1, 0, 0)
			]
		});
		this.convexPolyhedronRepresentation = a, a.material = this.material;
	}
	calculateLocalInertia(t, n) {
		return n === void 0 && (n = new r()), e.calculateInertia(this.halfExtents, t, n), n;
	}
	static calculateInertia(e, t, n) {
		let r = e;
		n.x = 1 / 12 * t * (2 * r.y * 2 * r.y + 2 * r.z * 2 * r.z), n.y = 1 / 12 * t * (2 * r.x * 2 * r.x + 2 * r.z * 2 * r.z), n.z = 1 / 12 * t * (2 * r.y * 2 * r.y + 2 * r.x * 2 * r.x);
	}
	getSideNormals(e, t) {
		let n = e, r = this.halfExtents;
		if (n[0].set(r.x, 0, 0), n[1].set(0, r.y, 0), n[2].set(0, 0, r.z), n[3].set(-r.x, 0, 0), n[4].set(0, -r.y, 0), n[5].set(0, 0, -r.z), t !== void 0) for (let e = 0; e !== n.length; e++) t.vmult(n[e], n[e]);
		return n;
	}
	volume() {
		return 8 * this.halfExtents.x * this.halfExtents.y * this.halfExtents.z;
	}
	updateBoundingSphereRadius() {
		this.boundingSphereRadius = this.halfExtents.length();
	}
	forEachWorldCorner(e, t, n) {
		let r = this.halfExtents, i = [
			[
				r.x,
				r.y,
				r.z
			],
			[
				-r.x,
				r.y,
				r.z
			],
			[
				-r.x,
				-r.y,
				r.z
			],
			[
				-r.x,
				-r.y,
				-r.z
			],
			[
				r.x,
				-r.y,
				-r.z
			],
			[
				r.x,
				r.y,
				-r.z
			],
			[
				-r.x,
				r.y,
				-r.z
			],
			[
				r.x,
				-r.y,
				r.z
			]
		];
		for (let r = 0; r < i.length; r++) T.set(i[r][0], i[r][1], i[r][2]), t.vmult(T, T), e.vadd(T, T), n(T.x, T.y, T.z);
	}
	calculateWorldAABB(e, t, n, r) {
		let i = this.halfExtents;
		E[0].set(i.x, i.y, i.z), E[1].set(-i.x, i.y, i.z), E[2].set(-i.x, -i.y, i.z), E[3].set(-i.x, -i.y, -i.z), E[4].set(i.x, -i.y, -i.z), E[5].set(i.x, i.y, -i.z), E[6].set(-i.x, i.y, -i.z), E[7].set(i.x, -i.y, i.z);
		let a = E[0];
		t.vmult(a, a), e.vadd(a, a), r.copy(a), n.copy(a);
		for (let i = 1; i < 8; i++) {
			let a = E[i];
			t.vmult(a, a), e.vadd(a, a);
			let o = a.x, s = a.y, c = a.z;
			o > r.x && (r.x = o), s > r.y && (r.y = s), c > r.z && (r.z = c), o < n.x && (n.x = o), s < n.y && (n.y = s), c < n.z && (n.z = c);
		}
	}
}, T = new r(), E = [
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r()
], D = {
	DYNAMIC: 1,
	STATIC: 2,
	KINEMATIC: 4
}, O = {
	AWAKE: 0,
	SLEEPY: 1,
	SLEEPING: 2
}, k = class e extends d {
	constructor(n) {
		n === void 0 && (n = {}), super(), this.id = e.idCounter++, this.index = -1, this.world = null, this.vlambda = new r(), this.collisionFilterGroup = typeof n.collisionFilterGroup == "number" ? n.collisionFilterGroup : 1, this.collisionFilterMask = typeof n.collisionFilterMask == "number" ? n.collisionFilterMask : -1, this.collisionResponse = typeof n.collisionResponse == "boolean" ? n.collisionResponse : !0, this.position = new r(), this.previousPosition = new r(), this.interpolatedPosition = new r(), this.initPosition = new r(), n.position && (this.position.copy(n.position), this.previousPosition.copy(n.position), this.interpolatedPosition.copy(n.position), this.initPosition.copy(n.position)), this.velocity = new r(), n.velocity && this.velocity.copy(n.velocity), this.initVelocity = new r(), this.force = new r();
		let i = typeof n.mass == "number" ? n.mass : 0;
		this.mass = i, this.invMass = i > 0 ? 1 / i : 0, this.material = n.material || null, this.linearDamping = typeof n.linearDamping == "number" ? n.linearDamping : .01, this.type = i <= 0 ? e.STATIC : e.DYNAMIC, typeof n.type == typeof e.STATIC && (this.type = n.type), this.allowSleep = n.allowSleep === void 0 ? !0 : n.allowSleep, this.sleepState = e.AWAKE, this.sleepSpeedLimit = n.sleepSpeedLimit === void 0 ? .1 : n.sleepSpeedLimit, this.sleepTimeLimit = n.sleepTimeLimit === void 0 ? 1 : n.sleepTimeLimit, this.timeLastSleepy = 0, this.wakeUpAfterNarrowphase = !1, this.torque = new r(), this.quaternion = new f(), this.initQuaternion = new f(), this.previousQuaternion = new f(), this.interpolatedQuaternion = new f(), n.quaternion && (this.quaternion.copy(n.quaternion), this.initQuaternion.copy(n.quaternion), this.previousQuaternion.copy(n.quaternion), this.interpolatedQuaternion.copy(n.quaternion)), this.angularVelocity = new r(), n.angularVelocity && this.angularVelocity.copy(n.angularVelocity), this.initAngularVelocity = new r(), this.shapes = [], this.shapeOffsets = [], this.shapeOrientations = [], this.inertia = new r(), this.invInertia = new r(), this.invInertiaWorld = new t(), this.invMassSolve = 0, this.invInertiaSolve = new r(), this.invInertiaWorldSolve = new t(), this.fixedRotation = n.fixedRotation === void 0 ? !1 : n.fixedRotation, this.angularDamping = n.angularDamping === void 0 ? .01 : n.angularDamping, this.linearFactor = new r(1, 1, 1), n.linearFactor && this.linearFactor.copy(n.linearFactor), this.angularFactor = new r(1, 1, 1), n.angularFactor && this.angularFactor.copy(n.angularFactor), this.aabb = new s(), this.aabbNeedsUpdate = !0, this.boundingRadius = 0, this.wlambda = new r(), this.isTrigger = !!n.isTrigger, n.shape && this.addShape(n.shape), this.updateMassProperties();
	}
	wakeUp() {
		let t = this.sleepState;
		this.sleepState = e.AWAKE, this.wakeUpAfterNarrowphase = !1, t === e.SLEEPING && this.dispatchEvent(e.wakeupEvent);
	}
	sleep() {
		this.sleepState = e.SLEEPING, this.velocity.set(0, 0, 0), this.angularVelocity.set(0, 0, 0), this.wakeUpAfterNarrowphase = !1;
	}
	sleepTick(t) {
		if (this.allowSleep) {
			let n = this.sleepState, r = this.velocity.lengthSquared() + this.angularVelocity.lengthSquared(), i = this.sleepSpeedLimit ** 2;
			n === e.AWAKE && r < i ? (this.sleepState = e.SLEEPY, this.timeLastSleepy = t, this.dispatchEvent(e.sleepyEvent)) : n === e.SLEEPY && r > i ? this.wakeUp() : n === e.SLEEPY && t - this.timeLastSleepy > this.sleepTimeLimit && (this.sleep(), this.dispatchEvent(e.sleepEvent));
		}
	}
	updateSolveMassProperties() {
		this.sleepState === e.SLEEPING || this.type === e.KINEMATIC ? (this.invMassSolve = 0, this.invInertiaSolve.setZero(), this.invInertiaWorldSolve.setZero()) : (this.invMassSolve = this.invMass, this.invInertiaSolve.copy(this.invInertia), this.invInertiaWorldSolve.copy(this.invInertiaWorld));
	}
	pointToLocalFrame(e, t) {
		return t === void 0 && (t = new r()), e.vsub(this.position, t), this.quaternion.conjugate().vmult(t, t), t;
	}
	vectorToLocalFrame(e, t) {
		return t === void 0 && (t = new r()), this.quaternion.conjugate().vmult(e, t), t;
	}
	pointToWorldFrame(e, t) {
		return t === void 0 && (t = new r()), this.quaternion.vmult(e, t), t.vadd(this.position, t), t;
	}
	vectorToWorldFrame(e, t) {
		return t === void 0 && (t = new r()), this.quaternion.vmult(e, t), t;
	}
	addShape(e, t, n) {
		let i = new r(), a = new f();
		return t && i.copy(t), n && a.copy(n), this.shapes.push(e), this.shapeOffsets.push(i), this.shapeOrientations.push(a), this.updateMassProperties(), this.updateBoundingRadius(), this.aabbNeedsUpdate = !0, e.body = this, this;
	}
	removeShape(e) {
		let t = this.shapes.indexOf(e);
		return t === -1 ? (console.warn("Shape does not belong to the body"), this) : (this.shapes.splice(t, 1), this.shapeOffsets.splice(t, 1), this.shapeOrientations.splice(t, 1), this.updateMassProperties(), this.updateBoundingRadius(), this.aabbNeedsUpdate = !0, e.body = null, this);
	}
	updateBoundingRadius() {
		let e = this.shapes, t = this.shapeOffsets, n = e.length, r = 0;
		for (let i = 0; i !== n; i++) {
			let n = e[i];
			n.updateBoundingSphereRadius();
			let a = t[i].length(), o = n.boundingSphereRadius;
			a + o > r && (r = a + o);
		}
		this.boundingRadius = r;
	}
	updateAABB() {
		let e = this.shapes, t = this.shapeOffsets, n = this.shapeOrientations, r = e.length, i = ee, a = te, o = this.quaternion, s = this.aabb, c = ne;
		for (let l = 0; l !== r; l++) {
			let r = e[l];
			o.vmult(t[l], i), i.vadd(this.position, i), o.mult(n[l], a), r.calculateWorldAABB(i, a, c.lowerBound, c.upperBound), l === 0 ? s.copy(c) : s.extend(c);
		}
		this.aabbNeedsUpdate = !1;
	}
	updateInertiaWorld(e) {
		let t = this.invInertia;
		if (!(t.x === t.y && t.y === t.z && !e)) {
			let e = re, n = ie;
			e.setRotationFromQuaternion(this.quaternion), e.transpose(n), e.scale(t, e), e.mmult(n, this.invInertiaWorld);
		}
	}
	applyForce(t, n) {
		if (n === void 0 && (n = new r()), this.type !== e.DYNAMIC) return;
		this.sleepState === e.SLEEPING && this.wakeUp();
		let i = ae;
		n.cross(t, i), this.force.vadd(t, this.force), this.torque.vadd(i, this.torque);
	}
	applyLocalForce(t, n) {
		if (n === void 0 && (n = new r()), this.type !== e.DYNAMIC) return;
		let i = oe, a = se;
		this.vectorToWorldFrame(t, i), this.vectorToWorldFrame(n, a), this.applyForce(i, a);
	}
	applyTorque(t) {
		this.type === e.DYNAMIC && (this.sleepState === e.SLEEPING && this.wakeUp(), this.torque.vadd(t, this.torque));
	}
	applyImpulse(t, n) {
		if (n === void 0 && (n = new r()), this.type !== e.DYNAMIC) return;
		this.sleepState === e.SLEEPING && this.wakeUp();
		let i = n, a = ce;
		a.copy(t), a.scale(this.invMass, a), this.velocity.vadd(a, this.velocity);
		let o = le;
		i.cross(t, o), this.invInertiaWorld.vmult(o, o), this.angularVelocity.vadd(o, this.angularVelocity);
	}
	applyLocalImpulse(t, n) {
		if (n === void 0 && (n = new r()), this.type !== e.DYNAMIC) return;
		let i = ue, a = de;
		this.vectorToWorldFrame(t, i), this.vectorToWorldFrame(n, a), this.applyImpulse(i, a);
	}
	updateMassProperties() {
		let e = fe;
		this.invMass = this.mass > 0 ? 1 / this.mass : 0;
		let t = this.inertia, n = this.fixedRotation;
		this.updateAABB(), e.set((this.aabb.upperBound.x - this.aabb.lowerBound.x) / 2, (this.aabb.upperBound.y - this.aabb.lowerBound.y) / 2, (this.aabb.upperBound.z - this.aabb.lowerBound.z) / 2), w.calculateInertia(e, this.mass, t), this.invInertia.set(t.x > 0 && !n ? 1 / t.x : 0, t.y > 0 && !n ? 1 / t.y : 0, t.z > 0 && !n ? 1 / t.z : 0), this.updateInertiaWorld(!0);
	}
	getVelocityAtWorldPoint(e, t) {
		let n = new r();
		return e.vsub(this.position, n), this.angularVelocity.cross(n, t), this.velocity.vadd(t, t), t;
	}
	integrate(t, n, r) {
		if (this.previousPosition.copy(this.position), this.previousQuaternion.copy(this.quaternion), !(this.type === e.DYNAMIC || this.type === e.KINEMATIC) || this.sleepState === e.SLEEPING) return;
		let i = this.velocity, a = this.angularVelocity, o = this.position, s = this.force, c = this.torque, l = this.quaternion, u = this.invMass, d = this.invInertiaWorld, f = this.linearFactor, p = u * t;
		i.x += s.x * p * f.x, i.y += s.y * p * f.y, i.z += s.z * p * f.z;
		let m = d.elements, h = this.angularFactor, g = c.x * h.x, _ = c.y * h.y, v = c.z * h.z;
		a.x += t * (m[0] * g + m[1] * _ + m[2] * v), a.y += t * (m[3] * g + m[4] * _ + m[5] * v), a.z += t * (m[6] * g + m[7] * _ + m[8] * v), o.x += i.x * t, o.y += i.y * t, o.z += i.z * t, l.integrate(this.angularVelocity, t, this.angularFactor, l), n && (r ? l.normalizeFast() : l.normalize()), this.aabbNeedsUpdate = !0, this.updateInertiaWorld();
	}
};
k.idCounter = 0, k.COLLIDE_EVENT_NAME = "collide", k.DYNAMIC = D.DYNAMIC, k.STATIC = D.STATIC, k.KINEMATIC = D.KINEMATIC, k.AWAKE = O.AWAKE, k.SLEEPY = O.SLEEPY, k.SLEEPING = O.SLEEPING, k.wakeupEvent = { type: "wakeup" }, k.sleepyEvent = { type: "sleepy" }, k.sleepEvent = { type: "sleep" };
var ee = new r(), te = new f(), ne = new s(), re = new t(), ie = new t();
new t();
var ae = new r(), oe = new r(), se = new r(), ce = new r(), le = new r(), ue = new r(), de = new r(), fe = new r(), pe = class {
	constructor() {
		this.world = null, this.useBoundingBoxes = !1, this.dirty = !0;
	}
	collisionPairs(e, t, n) {
		throw Error("collisionPairs not implemented for this BroadPhase class!");
	}
	needBroadphaseCollision(e, t) {
		return !((e.collisionFilterGroup & t.collisionFilterMask) === 0 || (t.collisionFilterGroup & e.collisionFilterMask) === 0 || ((e.type & k.STATIC) !== 0 || e.sleepState === k.SLEEPING) && ((t.type & k.STATIC) !== 0 || t.sleepState === k.SLEEPING));
	}
	intersectionTest(e, t, n, r) {
		this.useBoundingBoxes ? this.doBoundingBoxBroadphase(e, t, n, r) : this.doBoundingSphereBroadphase(e, t, n, r);
	}
	doBoundingSphereBroadphase(e, t, n, r) {
		let i = me;
		t.position.vsub(e.position, i);
		let a = (e.boundingRadius + t.boundingRadius) ** 2;
		i.lengthSquared() < a && (n.push(e), r.push(t));
	}
	doBoundingBoxBroadphase(e, t, n, r) {
		e.aabbNeedsUpdate && e.updateAABB(), t.aabbNeedsUpdate && t.updateAABB(), e.aabb.overlaps(t.aabb) && (n.push(e), r.push(t));
	}
	makePairsUnique(e, t) {
		let n = he, r = ge, i = _e, a = e.length;
		for (let n = 0; n !== a; n++) r[n] = e[n], i[n] = t[n];
		e.length = 0, t.length = 0;
		for (let e = 0; e !== a; e++) {
			let t = r[e].id, a = i[e].id, o = t < a ? `${t},${a}` : `${a},${t}`;
			n[o] = e, n.keys.push(o);
		}
		for (let a = 0; a !== n.keys.length; a++) {
			let a = n.keys.pop(), o = n[a];
			e.push(r[o]), t.push(i[o]), delete n[a];
		}
	}
	setWorld(e) {}
	static boundingSphereCheck(e, t) {
		let n = new r();
		e.position.vsub(t.position, n);
		let i = e.shapes[0], a = t.shapes[0];
		return (i.boundingSphereRadius + a.boundingSphereRadius) ** 2 > n.lengthSquared();
	}
	aabbQuery(e, t, n) {
		return console.warn(".aabbQuery is not implemented in this Broadphase subclass."), [];
	}
}, me = new r();
new r(), new f(), new r();
var he = { keys: [] }, ge = [], _e = [];
new r(), new r(), new r();
var ve = class extends pe {
	constructor() {
		super();
	}
	collisionPairs(e, t, n) {
		let r = e.bodies, i = r.length, a, o;
		for (let e = 0; e !== i; e++) for (let i = 0; i !== e; i++) a = r[e], o = r[i], this.needBroadphaseCollision(a, o) && this.intersectionTest(a, o, t, n);
	}
	aabbQuery(e, t, n) {
		n === void 0 && (n = []);
		for (let r = 0; r < e.bodies.length; r++) {
			let i = e.bodies[r];
			i.aabbNeedsUpdate && i.updateAABB(), i.aabb.overlaps(t) && n.push(i);
		}
		return n;
	}
}, ye = class {
	constructor() {
		this.rayFromWorld = new r(), this.rayToWorld = new r(), this.hitNormalWorld = new r(), this.hitPointWorld = new r(), this.hasHit = !1, this.shape = null, this.body = null, this.hitFaceIndex = -1, this.distance = -1, this.shouldStop = !1;
	}
	reset() {
		this.rayFromWorld.setZero(), this.rayToWorld.setZero(), this.hitNormalWorld.setZero(), this.hitPointWorld.setZero(), this.hasHit = !1, this.shape = null, this.body = null, this.hitFaceIndex = -1, this.distance = -1, this.shouldStop = !1;
	}
	abort() {
		this.shouldStop = !0;
	}
	set(e, t, n, r, i, a, o) {
		this.rayFromWorld.copy(e), this.rayToWorld.copy(t), this.hitNormalWorld.copy(n), this.hitPointWorld.copy(r), this.shape = i, this.body = a, this.distance = o;
	}
}, be, xe, Se, Ce, we, Te, Ee, De = {
	CLOSEST: 1,
	ANY: 2,
	ALL: 4
};
be = g.types.SPHERE, xe = g.types.PLANE, Se = g.types.BOX, Ce = g.types.CYLINDER, we = g.types.CONVEXPOLYHEDRON, Te = g.types.HEIGHTFIELD, Ee = g.types.TRIMESH;
var A = class e {
	get [be]() {
		return this._intersectSphere;
	}
	get [xe]() {
		return this._intersectPlane;
	}
	get [Se]() {
		return this._intersectBox;
	}
	get [Ce]() {
		return this._intersectConvex;
	}
	get [we]() {
		return this._intersectConvex;
	}
	get [Te]() {
		return this._intersectHeightfield;
	}
	get [Ee]() {
		return this._intersectTrimesh;
	}
	constructor(t, n) {
		t === void 0 && (t = new r()), n === void 0 && (n = new r()), this.from = t.clone(), this.to = n.clone(), this.direction = new r(), this.precision = 1e-4, this.checkCollisionResponse = !0, this.skipBackfaces = !1, this.collisionFilterMask = -1, this.collisionFilterGroup = -1, this.mode = e.ANY, this.result = new ye(), this.hasHit = !1, this.callback = (e) => {};
	}
	intersectWorld(t, n) {
		return this.mode = n.mode || e.ANY, this.result = n.result || new ye(), this.skipBackfaces = !!n.skipBackfaces, this.collisionFilterMask = n.collisionFilterMask === void 0 ? -1 : n.collisionFilterMask, this.collisionFilterGroup = n.collisionFilterGroup === void 0 ? -1 : n.collisionFilterGroup, this.checkCollisionResponse = n.checkCollisionResponse === void 0 ? !0 : n.checkCollisionResponse, n.from && this.from.copy(n.from), n.to && this.to.copy(n.to), this.callback = n.callback || (() => {}), this.hasHit = !1, this.result.reset(), this.updateDirection(), this.getAABB(Oe), ke.length = 0, t.broadphase.aabbQuery(t, Oe, ke), this.intersectBodies(ke), this.hasHit;
	}
	intersectBody(e, t) {
		t && (this.result = t, this.updateDirection());
		let n = this.checkCollisionResponse;
		if (n && !e.collisionResponse || (this.collisionFilterGroup & e.collisionFilterMask) === 0 || (e.collisionFilterGroup & this.collisionFilterMask) === 0) return;
		let r = je, i = Me;
		for (let t = 0, a = e.shapes.length; t < a; t++) {
			let a = e.shapes[t];
			if (!(n && !a.collisionResponse) && (e.quaternion.mult(e.shapeOrientations[t], i), e.quaternion.vmult(e.shapeOffsets[t], r), r.vadd(e.position, r), this.intersectShape(a, i, r, e), this.result.shouldStop)) break;
		}
	}
	intersectBodies(e, t) {
		t && (this.result = t, this.updateDirection());
		for (let t = 0, n = e.length; !this.result.shouldStop && t < n; t++) this.intersectBody(e[t]);
	}
	updateDirection() {
		this.to.vsub(this.from, this.direction), this.direction.normalize();
	}
	intersectShape(e, t, n, r) {
		let i = this.from;
		if (Xe(i, this.direction, n) > e.boundingSphereRadius) return;
		let a = this[e.type];
		a && a.call(this, e, t, n, r, e);
	}
	_intersectBox(e, t, n, r, i) {
		return this._intersectConvex(e.convexPolyhedronRepresentation, t, n, r, i);
	}
	_intersectPlane(e, t, n, i, a) {
		let o = this.from, s = this.to, c = this.direction, l = new r(0, 0, 1);
		t.vmult(l, l);
		let u = new r();
		o.vsub(n, u);
		let d = u.dot(l);
		if (s.vsub(n, u), d * u.dot(l) > 0 || o.distanceTo(s) < d) return;
		let f = l.dot(c);
		if (Math.abs(f) < this.precision) return;
		let p = new r(), m = new r(), h = new r();
		o.vsub(n, p);
		let g = -l.dot(p) / f;
		c.scale(g, m), o.vadd(m, h), this.reportIntersection(l, h, a, i, -1);
	}
	getAABB(e) {
		let { lowerBound: t, upperBound: n } = e, r = this.to, i = this.from;
		t.x = Math.min(r.x, i.x), t.y = Math.min(r.y, i.y), t.z = Math.min(r.z, i.z), n.x = Math.max(r.x, i.x), n.y = Math.max(r.y, i.y), n.z = Math.max(r.z, i.z);
	}
	_intersectHeightfield(e, t, n, r, i) {
		e.data, e.elementSize;
		let a = Fe;
		a.from.copy(this.from), a.to.copy(this.to), _.pointToLocalFrame(n, t, a.from, a.from), _.pointToLocalFrame(n, t, a.to, a.to), a.updateDirection();
		let o = Ie, c, l, u, d;
		c = l = 0, u = d = e.data.length - 1;
		let f = new s();
		a.getAABB(f), e.getIndexOfPosition(f.lowerBound.x, f.lowerBound.y, o, !0), c = Math.max(c, o[0]), l = Math.max(l, o[1]), e.getIndexOfPosition(f.upperBound.x, f.upperBound.y, o, !0), u = Math.min(u, o[0] + 1), d = Math.min(d, o[1] + 1);
		for (let o = c; o < u; o++) for (let s = l; s < d; s++) {
			if (this.result.shouldStop) return;
			if (e.getAabbAtIndex(o, s, f), f.overlapsRay(a)) {
				if (e.getConvexTrianglePillar(o, s, !1), _.pointToWorldFrame(n, t, e.pillarOffset, Pe), this._intersectConvex(e.pillarConvex, t, Pe, r, i, Ne), this.result.shouldStop) return;
				e.getConvexTrianglePillar(o, s, !0), _.pointToWorldFrame(n, t, e.pillarOffset, Pe), this._intersectConvex(e.pillarConvex, t, Pe, r, i, Ne);
			}
		}
	}
	_intersectSphere(e, t, n, r, i) {
		let a = this.from, o = this.to, s = e.radius, c = (o.x - a.x) ** 2 + (o.y - a.y) ** 2 + (o.z - a.z) ** 2, l = 2 * ((o.x - a.x) * (a.x - n.x) + (o.y - a.y) * (a.y - n.y) + (o.z - a.z) * (a.z - n.z)), u = (a.x - n.x) ** 2 + (a.y - n.y) ** 2 + (a.z - n.z) ** 2 - s ** 2, d = l ** 2 - 4 * c * u, f = Le, p = Re;
		if (!(d < 0)) if (d === 0) a.lerp(o, d, f), f.vsub(n, p), p.normalize(), this.reportIntersection(p, f, i, r, -1);
		else {
			let e = (-l - Math.sqrt(d)) / (2 * c), t = (-l + Math.sqrt(d)) / (2 * c);
			if (e >= 0 && e <= 1 && (a.lerp(o, e, f), f.vsub(n, p), p.normalize(), this.reportIntersection(p, f, i, r, -1)), this.result.shouldStop) return;
			t >= 0 && t <= 1 && (a.lerp(o, t, f), f.vsub(n, p), p.normalize(), this.reportIntersection(p, f, i, r, -1));
		}
	}
	_intersectConvex(t, n, r, i, a, o) {
		let s = ze, c = Be, l = o && o.faceList || null, u = t.faces, d = t.vertices, f = t.faceNormals, p = this.direction, m = this.from, h = this.to, g = m.distanceTo(h), _ = l ? l.length : u.length, v = this.result;
		for (let t = 0; !v.shouldStop && t < _; t++) {
			let o = l ? l[t] : t, h = u[o], _ = f[o], y = n, b = r;
			c.copy(d[h[0]]), y.vmult(c, c), c.vadd(b, c), c.vsub(m, c), y.vmult(_, s);
			let x = p.dot(s);
			if (Math.abs(x) < this.precision) continue;
			let S = s.dot(c) / x;
			if (!(S < 0)) {
				p.scale(S, M), M.vadd(m, M), N.copy(d[h[0]]), y.vmult(N, N), b.vadd(N, N);
				for (let t = 1; !v.shouldStop && t < h.length - 1; t++) {
					P.copy(d[h[t]]), F.copy(d[h[t + 1]]), y.vmult(P, P), y.vmult(F, F), b.vadd(P, P), b.vadd(F, F);
					let n = M.distanceTo(m);
					!(e.pointInTriangle(M, N, P, F) || e.pointInTriangle(M, P, N, F)) || n > g || this.reportIntersection(s, M, a, i, o);
				}
			}
		}
	}
	_intersectTrimesh(t, n, r, i, a, o) {
		let s = Ve, c = qe, l = Je, u = Be, d = He, f = Ue, p = We, m = Ke, h = Ge, g = t.indices;
		t.vertices;
		let v = this.from, y = this.to, b = this.direction;
		l.position.copy(r), l.quaternion.copy(n), _.vectorToLocalFrame(r, n, b, d), _.pointToLocalFrame(r, n, v, f), _.pointToLocalFrame(r, n, y, p), p.x *= t.scale.x, p.y *= t.scale.y, p.z *= t.scale.z, f.x *= t.scale.x, f.y *= t.scale.y, f.z *= t.scale.z, p.vsub(f, d), d.normalize();
		let x = f.distanceSquared(p);
		t.tree.rayQuery(this, l, c);
		for (let o = 0, l = c.length; !this.result.shouldStop && o !== l; o++) {
			let l = c[o];
			t.getNormal(l, s), t.getVertex(g[l * 3], N), N.vsub(f, u);
			let p = d.dot(s), v = s.dot(u) / p;
			if (v < 0) continue;
			d.scale(v, M), M.vadd(f, M), t.getVertex(g[l * 3 + 1], P), t.getVertex(g[l * 3 + 2], F);
			let y = M.distanceSquared(f);
			!(e.pointInTriangle(M, P, N, F) || e.pointInTriangle(M, N, P, F)) || y > x || (_.vectorToWorldFrame(n, s, h), _.pointToWorldFrame(r, n, M, m), this.reportIntersection(h, m, a, i, l));
		}
		c.length = 0;
	}
	reportIntersection(t, n, r, i, a) {
		let o = this.from, s = this.to, c = o.distanceTo(n), l = this.result;
		if (!(this.skipBackfaces && t.dot(this.direction) > 0)) switch (l.hitFaceIndex = a === void 0 ? -1 : a, this.mode) {
			case e.ALL:
				this.hasHit = !0, l.set(o, s, t, n, r, i, c), l.hasHit = !0, this.callback(l);
				break;
			case e.CLOSEST:
				(c < l.distance || !l.hasHit) && (this.hasHit = !0, l.hasHit = !0, l.set(o, s, t, n, r, i, c));
				break;
			case e.ANY:
				this.hasHit = !0, l.hasHit = !0, l.set(o, s, t, n, r, i, c), l.shouldStop = !0;
				break;
		}
	}
	static pointInTriangle(e, t, n, r) {
		r.vsub(t, I), n.vsub(t, j), e.vsub(t, Ae);
		let i = I.dot(I), a = I.dot(j), o = I.dot(Ae), s = j.dot(j), c = j.dot(Ae), l, u;
		return (l = s * o - a * c) >= 0 && (u = i * c - a * o) >= 0 && l + u < i * s - a * a;
	}
};
A.CLOSEST = De.CLOSEST, A.ANY = De.ANY, A.ALL = De.ALL;
var Oe = new s(), ke = [], j = new r(), Ae = new r(), je = new r(), Me = new f(), M = new r(), N = new r(), P = new r(), F = new r();
new r(), new ye();
var Ne = { faceList: [0] }, Pe = new r(), Fe = new A(), Ie = [], Le = new r(), Re = new r(), ze = new r();
new r(), new r();
var Be = new r(), Ve = new r(), He = new r(), Ue = new r(), We = new r(), Ge = new r(), Ke = new r();
new s();
var qe = [], Je = new _(), I = new r(), Ye = new r();
function Xe(e, t, n) {
	n.vsub(e, I);
	let r = I.dot(t);
	return t.scale(r, Ye), Ye.vadd(e, Ye), n.distanceTo(Ye);
}
var Ze = class {
	static defaults(e, t) {
		e === void 0 && (e = {});
		for (let n in t) n in e || (e[n] = t[n]);
		return e;
	}
}, Qe = class e {
	constructor(t, n, r) {
		r === void 0 && (r = {}), r = Ze.defaults(r, {
			collideConnected: !0,
			wakeUpBodies: !0
		}), this.equations = [], this.bodyA = t, this.bodyB = n, this.id = e.idCounter++, this.collideConnected = r.collideConnected, r.wakeUpBodies && (t && t.wakeUp(), n && n.wakeUp());
	}
	update() {
		throw Error("method update() not implmemented in this Constraint subclass!");
	}
	enable() {
		let e = this.equations;
		for (let t = 0; t < e.length; t++) e[t].enabled = !0;
	}
	disable() {
		let e = this.equations;
		for (let t = 0; t < e.length; t++) e[t].enabled = !1;
	}
};
Qe.idCounter = 0;
var $e = class {
	constructor() {
		this.spatial = new r(), this.rotational = new r();
	}
	multiplyElement(e) {
		return e.spatial.dot(this.spatial) + e.rotational.dot(this.rotational);
	}
	multiplyVectors(e, t) {
		return e.dot(this.spatial) + t.dot(this.rotational);
	}
}, et = class e {
	constructor(t, n, r, i) {
		r === void 0 && (r = -1e6), i === void 0 && (i = 1e6), this.id = e.idCounter++, this.minForce = r, this.maxForce = i, this.bi = t, this.bj = n, this.a = 0, this.b = 0, this.eps = 0, this.jacobianElementA = new $e(), this.jacobianElementB = new $e(), this.enabled = !0, this.multiplier = 0, this.setSpookParams(1e7, 4, 1 / 60);
	}
	setSpookParams(e, t, n) {
		let r = t, i = e, a = n;
		this.a = 4 / (a * (1 + 4 * r)), this.b = 4 * r / (1 + 4 * r), this.eps = 4 / (a * a * i * (1 + 4 * r));
	}
	computeB(e, t, n) {
		let r = this.computeGW(), i = this.computeGq(), a = this.computeGiMf();
		return -i * e - r * t - a * n;
	}
	computeGq() {
		let e = this.jacobianElementA, t = this.jacobianElementB, n = this.bi, r = this.bj, i = n.position, a = r.position;
		return e.spatial.dot(i) + t.spatial.dot(a);
	}
	computeGW() {
		let e = this.jacobianElementA, t = this.jacobianElementB, n = this.bi, r = this.bj, i = n.velocity, a = r.velocity, o = n.angularVelocity, s = r.angularVelocity;
		return e.multiplyVectors(i, o) + t.multiplyVectors(a, s);
	}
	computeGWlambda() {
		let e = this.jacobianElementA, t = this.jacobianElementB, n = this.bi, r = this.bj, i = n.vlambda, a = r.vlambda, o = n.wlambda, s = r.wlambda;
		return e.multiplyVectors(i, o) + t.multiplyVectors(a, s);
	}
	computeGiMf() {
		let e = this.jacobianElementA, t = this.jacobianElementB, n = this.bi, r = this.bj, i = n.force, a = n.torque, o = r.force, s = r.torque, c = n.invMassSolve, l = r.invMassSolve;
		return i.scale(c, tt), o.scale(l, nt), n.invInertiaWorldSolve.vmult(a, rt), r.invInertiaWorldSolve.vmult(s, it), e.multiplyVectors(tt, rt) + t.multiplyVectors(nt, it);
	}
	computeGiMGt() {
		let e = this.jacobianElementA, t = this.jacobianElementB, n = this.bi, r = this.bj, i = n.invMassSolve, a = r.invMassSolve, o = n.invInertiaWorldSolve, s = r.invInertiaWorldSolve, c = i + a;
		return o.vmult(e.rotational, at), c += at.dot(e.rotational), s.vmult(t.rotational, at), c += at.dot(t.rotational), c;
	}
	addToWlambda(e) {
		let t = this.jacobianElementA, n = this.jacobianElementB, r = this.bi, i = this.bj, a = ot;
		r.vlambda.addScaledVector(r.invMassSolve * e, t.spatial, r.vlambda), i.vlambda.addScaledVector(i.invMassSolve * e, n.spatial, i.vlambda), r.invInertiaWorldSolve.vmult(t.rotational, a), r.wlambda.addScaledVector(e, a, r.wlambda), i.invInertiaWorldSolve.vmult(n.rotational, a), i.wlambda.addScaledVector(e, a, i.wlambda);
	}
	computeC() {
		return this.computeGiMGt() + this.eps;
	}
};
et.idCounter = 0;
var tt = new r(), nt = new r(), rt = new r(), it = new r(), at = new r(), ot = new r(), st = class extends et {
	constructor(e, t, n) {
		n === void 0 && (n = 1e6), super(e, t, 0, n), this.restitution = 0, this.ri = new r(), this.rj = new r(), this.ni = new r();
	}
	computeB(e) {
		let t = this.a, n = this.b, r = this.bi, i = this.bj, a = this.ri, o = this.rj, s = ct, c = lt, l = r.velocity, u = r.angularVelocity;
		r.force, r.torque;
		let d = i.velocity, f = i.angularVelocity;
		i.force, i.torque;
		let p = ut, m = this.jacobianElementA, h = this.jacobianElementB, g = this.ni;
		a.cross(g, s), o.cross(g, c), g.negate(m.spatial), s.negate(m.rotational), h.spatial.copy(g), h.rotational.copy(c), p.copy(i.position), p.vadd(o, p), p.vsub(r.position, p), p.vsub(a, p);
		let _ = g.dot(p), v = this.restitution + 1, y = v * d.dot(g) - v * l.dot(g) + f.dot(c) - u.dot(s), b = this.computeGiMf();
		return -_ * t - y * n - e * b;
	}
	getImpactVelocityAlongNormal() {
		let e = dt, t = ft, n = pt, r = mt, i = ht;
		return this.bi.position.vadd(this.ri, n), this.bj.position.vadd(this.rj, r), this.bi.getVelocityAtWorldPoint(n, e), this.bj.getVelocityAtWorldPoint(r, t), e.vsub(t, i), this.ni.dot(i);
	}
}, ct = new r(), lt = new r(), ut = new r(), dt = new r(), ft = new r(), pt = new r(), mt = new r(), ht = new r();
new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r();
var gt = class extends et {
	constructor(e, t, n) {
		super(e, t, -n, n), this.ri = new r(), this.rj = new r(), this.t = new r();
	}
	computeB(e) {
		this.a;
		let t = this.b;
		this.bi, this.bj;
		let n = this.ri, r = this.rj, i = _t, a = vt, o = this.t;
		n.cross(o, i), r.cross(o, a);
		let s = this.jacobianElementA, c = this.jacobianElementB;
		o.negate(s.spatial), i.negate(s.rotational), c.spatial.copy(o), c.rotational.copy(a);
		let l = this.computeGW(), u = this.computeGiMf();
		return -l * t - e * u;
	}
}, _t = new r(), vt = new r(), L = class e {
	constructor(t, n, r) {
		r = Ze.defaults(r, {
			friction: .3,
			restitution: .3,
			contactEquationStiffness: 1e7,
			contactEquationRelaxation: 3,
			frictionEquationStiffness: 1e7,
			frictionEquationRelaxation: 3
		}), this.id = e.idCounter++, this.materials = [t, n], this.friction = r.friction, this.restitution = r.restitution, this.contactEquationStiffness = r.contactEquationStiffness, this.contactEquationRelaxation = r.contactEquationRelaxation, this.frictionEquationStiffness = r.frictionEquationStiffness, this.frictionEquationRelaxation = r.frictionEquationRelaxation;
	}
};
L.idCounter = 0;
var R = class e {
	constructor(t) {
		t === void 0 && (t = {});
		let n = "";
		typeof t == "string" && (n = t, t = {}), this.name = n, this.id = e.idCounter++, this.friction = t.friction === void 0 ? -1 : t.friction, this.restitution = t.restitution === void 0 ? -1 : t.restitution;
	}
};
R.idCounter = 0, new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new A(), new r(), new r(), new r(), new r(1, 0, 0), new r(0, 1, 0), new r(0, 0, 1), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r();
var yt = class extends y {
	constructor(e, t, n, i) {
		if (e === void 0 && (e = 1), t === void 0 && (t = 1), n === void 0 && (n = 1), i === void 0 && (i = 8), e < 0) throw Error("The cylinder radiusTop cannot be negative.");
		if (t < 0) throw Error("The cylinder radiusBottom cannot be negative.");
		let a = i, o = [], s = [], c = [], l = [], u = [], d = Math.cos, f = Math.sin;
		o.push(new r(-t * f(0), -n * .5, t * d(0))), l.push(0), o.push(new r(-e * f(0), n * .5, e * d(0))), u.push(1);
		for (let i = 0; i < a; i++) {
			let p = 2 * Math.PI / a * (i + 1), m = 2 * Math.PI / a * (i + .5);
			i < a - 1 ? (o.push(new r(-t * f(p), -n * .5, t * d(p))), l.push(2 * i + 2), o.push(new r(-e * f(p), n * .5, e * d(p))), u.push(2 * i + 3), c.push([
				2 * i,
				2 * i + 1,
				2 * i + 3,
				2 * i + 2
			])) : c.push([
				2 * i,
				2 * i + 1,
				1,
				0
			]), (a % 2 == 1 || i < a / 2) && s.push(new r(-f(m), 0, d(m)));
		}
		c.push(l), s.push(new r(0, 1, 0));
		let p = [];
		for (let e = 0; e < u.length; e++) p.push(u[u.length - e - 1]);
		c.push(p), super({
			vertices: o,
			faces: c,
			axes: s
		}), this.type = g.types.CYLINDER, this.radiusTop = e, this.radiusBottom = t, this.height = n, this.numSegments = i;
	}
}, z = class extends g {
	constructor() {
		super({ type: g.types.PLANE }), this.worldNormal = new r(), this.worldNormalNeedsUpdate = !0, this.boundingSphereRadius = Number.MAX_VALUE;
	}
	computeWorldNormal(e) {
		let t = this.worldNormal;
		t.set(0, 0, 1), e.vmult(t, t), this.worldNormalNeedsUpdate = !1;
	}
	calculateLocalInertia(e, t) {
		return t === void 0 && (t = new r()), t;
	}
	volume() {
		return Number.MAX_VALUE;
	}
	calculateWorldAABB(e, t, n, r) {
		B.set(0, 0, 1), t.vmult(B, B);
		let i = Number.MAX_VALUE;
		n.set(-i, -i, -i), r.set(i, i, i), B.x === 1 ? r.x = e.x : B.x === -1 && (n.x = e.x), B.y === 1 ? r.y = e.y : B.y === -1 && (n.y = e.y), B.z === 1 ? r.z = e.z : B.z === -1 && (n.z = e.z);
	}
	updateBoundingSphereRadius() {
		this.boundingSphereRadius = Number.MAX_VALUE;
	}
}, B = new r();
new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new s(), new r(), new s(), new r(), new r(), new r(), new r(), new r(), new r(), new r(), new s(), new r(), new _(), new s();
var bt = class {
	constructor() {
		this.equations = [];
	}
	solve(e, t) {
		return 0;
	}
	addEquation(e) {
		e.enabled && !e.bi.isTrigger && !e.bj.isTrigger && this.equations.push(e);
	}
	removeEquation(e) {
		let t = this.equations, n = t.indexOf(e);
		n !== -1 && t.splice(n, 1);
	}
	removeAllEquations() {
		this.equations.length = 0;
	}
}, xt = class extends bt {
	constructor() {
		super(), this.iterations = 10, this.tolerance = 1e-7;
	}
	solve(e, t) {
		let n = 0, r = this.iterations, i = this.tolerance * this.tolerance, a = this.equations, o = a.length, s = t.bodies, c = s.length, l = e, u, d, f, p, m, h;
		if (o !== 0) for (let e = 0; e !== c; e++) s[e].updateSolveMassProperties();
		let g = Ct, _ = wt, v = St;
		g.length = o, _.length = o, v.length = o;
		for (let e = 0; e !== o; e++) {
			let t = a[e];
			v[e] = 0, _[e] = t.computeB(l), g[e] = 1 / t.computeC();
		}
		if (o !== 0) {
			for (let e = 0; e !== c; e++) {
				let t = s[e], n = t.vlambda, r = t.wlambda;
				n.set(0, 0, 0), r.set(0, 0, 0);
			}
			for (n = 0; n !== r; n++) {
				p = 0;
				for (let e = 0; e !== o; e++) {
					let t = a[e];
					u = _[e], d = g[e], h = v[e], m = t.computeGWlambda(), f = d * (u - m - t.eps * h), h + f < t.minForce ? f = t.minForce - h : h + f > t.maxForce && (f = t.maxForce - h), v[e] += f, p += f > 0 ? f : -f, t.addToWlambda(f);
				}
				if (p * p < i) break;
			}
			for (let e = 0; e !== c; e++) {
				let t = s[e], n = t.velocity, r = t.angularVelocity;
				t.vlambda.vmul(t.linearFactor, t.vlambda), n.vadd(t.vlambda, n), t.wlambda.vmul(t.angularFactor, t.wlambda), r.vadd(t.wlambda, r);
			}
			let e = a.length, t = 1 / l;
			for (; e--;) a[e].multiplier = v[e] * t;
		}
		return n;
	}
}, St = [], Ct = [], wt = [];
k.STATIC;
var Tt = class {
	constructor() {
		this.objects = [], this.type = Object;
	}
	release() {
		let e = arguments.length;
		for (let t = 0; t !== e; t++) this.objects.push(t < 0 || arguments.length <= t ? void 0 : arguments[t]);
		return this;
	}
	get() {
		return this.objects.length === 0 ? this.constructObject() : this.objects.pop();
	}
	constructObject() {
		throw Error("constructObject() not implemented in this Pool subclass yet!");
	}
	resize(e) {
		let t = this.objects;
		for (; t.length > e;) t.pop();
		for (; t.length < e;) t.push(this.constructObject());
		return this;
	}
}, Et = class extends Tt {
	constructor() {
		super(...arguments), this.type = r;
	}
	constructObject() {
		return new r();
	}
}, V = {
	sphereSphere: g.types.SPHERE,
	spherePlane: g.types.SPHERE | g.types.PLANE,
	boxBox: g.types.BOX | g.types.BOX,
	sphereBox: g.types.SPHERE | g.types.BOX,
	planeBox: g.types.PLANE | g.types.BOX,
	convexConvex: g.types.CONVEXPOLYHEDRON,
	sphereConvex: g.types.SPHERE | g.types.CONVEXPOLYHEDRON,
	planeConvex: g.types.PLANE | g.types.CONVEXPOLYHEDRON,
	boxConvex: g.types.BOX | g.types.CONVEXPOLYHEDRON,
	sphereHeightfield: g.types.SPHERE | g.types.HEIGHTFIELD,
	boxHeightfield: g.types.BOX | g.types.HEIGHTFIELD,
	convexHeightfield: g.types.CONVEXPOLYHEDRON | g.types.HEIGHTFIELD,
	sphereParticle: g.types.PARTICLE | g.types.SPHERE,
	planeParticle: g.types.PLANE | g.types.PARTICLE,
	boxParticle: g.types.BOX | g.types.PARTICLE,
	convexParticle: g.types.PARTICLE | g.types.CONVEXPOLYHEDRON,
	cylinderCylinder: g.types.CYLINDER,
	sphereCylinder: g.types.SPHERE | g.types.CYLINDER,
	planeCylinder: g.types.PLANE | g.types.CYLINDER,
	boxCylinder: g.types.BOX | g.types.CYLINDER,
	convexCylinder: g.types.CONVEXPOLYHEDRON | g.types.CYLINDER,
	heightfieldCylinder: g.types.HEIGHTFIELD | g.types.CYLINDER,
	particleCylinder: g.types.PARTICLE | g.types.CYLINDER,
	sphereTrimesh: g.types.SPHERE | g.types.TRIMESH,
	planeTrimesh: g.types.PLANE | g.types.TRIMESH
}, Dt = class {
	get [V.sphereSphere]() {
		return this.sphereSphere;
	}
	get [V.spherePlane]() {
		return this.spherePlane;
	}
	get [V.boxBox]() {
		return this.boxBox;
	}
	get [V.sphereBox]() {
		return this.sphereBox;
	}
	get [V.planeBox]() {
		return this.planeBox;
	}
	get [V.convexConvex]() {
		return this.convexConvex;
	}
	get [V.sphereConvex]() {
		return this.sphereConvex;
	}
	get [V.planeConvex]() {
		return this.planeConvex;
	}
	get [V.boxConvex]() {
		return this.boxConvex;
	}
	get [V.sphereHeightfield]() {
		return this.sphereHeightfield;
	}
	get [V.boxHeightfield]() {
		return this.boxHeightfield;
	}
	get [V.convexHeightfield]() {
		return this.convexHeightfield;
	}
	get [V.sphereParticle]() {
		return this.sphereParticle;
	}
	get [V.planeParticle]() {
		return this.planeParticle;
	}
	get [V.boxParticle]() {
		return this.boxParticle;
	}
	get [V.convexParticle]() {
		return this.convexParticle;
	}
	get [V.cylinderCylinder]() {
		return this.convexConvex;
	}
	get [V.sphereCylinder]() {
		return this.sphereConvex;
	}
	get [V.planeCylinder]() {
		return this.planeConvex;
	}
	get [V.boxCylinder]() {
		return this.boxConvex;
	}
	get [V.convexCylinder]() {
		return this.convexConvex;
	}
	get [V.heightfieldCylinder]() {
		return this.heightfieldCylinder;
	}
	get [V.particleCylinder]() {
		return this.particleCylinder;
	}
	get [V.sphereTrimesh]() {
		return this.sphereTrimesh;
	}
	get [V.planeTrimesh]() {
		return this.planeTrimesh;
	}
	constructor(e) {
		this.contactPointPool = [], this.frictionEquationPool = [], this.result = [], this.frictionResult = [], this.v3pool = new Et(), this.world = e, this.currentContactMaterial = e.defaultContactMaterial, this.enableFrictionReduction = !1;
	}
	createContactEquation(e, t, n, r, i, a) {
		let o;
		this.contactPointPool.length ? (o = this.contactPointPool.pop(), o.bi = e, o.bj = t) : o = new st(e, t), o.enabled = e.collisionResponse && t.collisionResponse && n.collisionResponse && r.collisionResponse;
		let s = this.currentContactMaterial;
		o.restitution = s.restitution, o.setSpookParams(s.contactEquationStiffness, s.contactEquationRelaxation, this.world.dt);
		let c = n.material || e.material, l = r.material || t.material;
		return c && l && c.restitution >= 0 && l.restitution >= 0 && (o.restitution = c.restitution * l.restitution), o.si = i || n, o.sj = a || r, o;
	}
	createFrictionEquationsFromContact(e, t) {
		let n = e.bi, r = e.bj, i = e.si, a = e.sj, o = this.world, s = this.currentContactMaterial, c = s.friction, l = i.material || n.material, u = a.material || r.material;
		if (l && u && l.friction >= 0 && u.friction >= 0 && (c = l.friction * u.friction), c > 0) {
			let i = c * (o.frictionGravity || o.gravity).length(), a = n.invMass + r.invMass;
			a > 0 && (a = 1 / a);
			let l = this.frictionEquationPool, u = l.length ? l.pop() : new gt(n, r, i * a), d = l.length ? l.pop() : new gt(n, r, i * a);
			return u.bi = d.bi = n, u.bj = d.bj = r, u.minForce = d.minForce = -i * a, u.maxForce = d.maxForce = i * a, u.ri.copy(e.ri), u.rj.copy(e.rj), d.ri.copy(e.ri), d.rj.copy(e.rj), e.ni.tangents(u.t, d.t), u.setSpookParams(s.frictionEquationStiffness, s.frictionEquationRelaxation, o.dt), d.setSpookParams(s.frictionEquationStiffness, s.frictionEquationRelaxation, o.dt), u.enabled = d.enabled = e.enabled, t.push(u, d), !0;
		}
		return !1;
	}
	createFrictionFromAverage(e) {
		let t = this.result[this.result.length - 1];
		if (!this.createFrictionEquationsFromContact(t, this.frictionResult) || e === 1) return;
		let n = this.frictionResult[this.frictionResult.length - 2], r = this.frictionResult[this.frictionResult.length - 1];
		H.setZero(), U.setZero(), W.setZero();
		let i = t.bi;
		t.bj;
		for (let n = 0; n !== e; n++) t = this.result[this.result.length - 1 - n], t.bi === i ? (H.vsub(t.ni, H), U.vadd(t.rj, U), W.vadd(t.ri, W)) : (H.vadd(t.ni, H), U.vadd(t.ri, U), W.vadd(t.rj, W));
		let a = 1 / e;
		U.scale(a, n.ri), W.scale(a, n.rj), r.ri.copy(n.ri), r.rj.copy(n.rj), H.normalize(), H.tangents(n.t, r.t);
	}
	getContacts(e, t, n, r, i, a, o) {
		this.contactPointPool = i, this.frictionEquationPool = o, this.result = r, this.frictionResult = a;
		let s = At, c = jt, l = Ot, u = kt;
		for (let r = 0, i = e.length; r !== i; r++) {
			let i = e[r], a = t[r], o = null;
			i.material && a.material && (o = n.getContactMaterial(i.material, a.material) || null);
			let d = i.type & k.KINEMATIC && a.type & k.STATIC || i.type & k.STATIC && a.type & k.KINEMATIC || i.type & k.KINEMATIC && a.type & k.KINEMATIC;
			for (let e = 0; e < i.shapes.length; e++) {
				i.quaternion.mult(i.shapeOrientations[e], s), i.quaternion.vmult(i.shapeOffsets[e], l), l.vadd(i.position, l);
				let t = i.shapes[e];
				for (let e = 0; e < a.shapes.length; e++) {
					a.quaternion.mult(a.shapeOrientations[e], c), a.quaternion.vmult(a.shapeOffsets[e], u), u.vadd(a.position, u);
					let r = a.shapes[e];
					if (!(t.collisionFilterMask & r.collisionFilterGroup && r.collisionFilterMask & t.collisionFilterGroup) || l.distanceTo(u) > t.boundingSphereRadius + r.boundingSphereRadius) continue;
					let f = null;
					t.material && r.material && (f = n.getContactMaterial(t.material, r.material) || null), this.currentContactMaterial = f || o || n.defaultContactMaterial;
					let p = t.type | r.type, m = this[p];
					if (m) {
						let e = !1;
						e = t.type < r.type ? m.call(this, t, r, l, u, s, c, i, a, t, r, d) : m.call(this, r, t, u, l, c, s, a, i, t, r, d), e && d && (n.shapeOverlapKeeper.set(t.id, r.id), n.bodyOverlapKeeper.set(i.id, a.id));
					}
				}
			}
		}
	}
	sphereSphere(e, t, n, r, i, a, o, s, c, l, u) {
		if (u) return n.distanceSquared(r) < (e.radius + t.radius) ** 2;
		let d = this.createContactEquation(o, s, e, t, c, l);
		r.vsub(n, d.ni), d.ni.normalize(), d.ri.copy(d.ni), d.rj.copy(d.ni), d.ri.scale(e.radius, d.ri), d.rj.scale(-t.radius, d.rj), d.ri.vadd(n, d.ri), d.ri.vsub(o.position, d.ri), d.rj.vadd(r, d.rj), d.rj.vsub(s.position, d.rj), this.result.push(d), this.createFrictionEquationsFromContact(d, this.frictionResult);
	}
	spherePlane(e, t, n, r, i, a, o, s, c, l, u) {
		let d = this.createContactEquation(o, s, e, t, c, l);
		if (d.ni.set(0, 0, 1), a.vmult(d.ni, d.ni), d.ni.negate(d.ni), d.ni.normalize(), d.ni.scale(e.radius, d.ri), n.vsub(r, Xt), d.ni.scale(d.ni.dot(Xt), Zt), Xt.vsub(Zt, d.rj), -Xt.dot(d.ni) <= e.radius) {
			if (u) return !0;
			let e = d.ri, t = d.rj;
			e.vadd(n, e), e.vsub(o.position, e), t.vadd(r, t), t.vsub(s.position, t), this.result.push(d), this.createFrictionEquationsFromContact(d, this.frictionResult);
		}
	}
	boxBox(e, t, n, r, i, a, o, s, c, l, u) {
		return e.convexPolyhedronRepresentation.material = e.material, t.convexPolyhedronRepresentation.material = t.material, e.convexPolyhedronRepresentation.collisionResponse = e.collisionResponse, t.convexPolyhedronRepresentation.collisionResponse = t.collisionResponse, this.convexConvex(e.convexPolyhedronRepresentation, t.convexPolyhedronRepresentation, n, r, i, a, o, s, e, t, u);
	}
	sphereBox(e, t, n, r, i, a, o, s, c, l, u) {
		let d = this.v3pool, f = sn;
		n.vsub(r, nn), t.getSideNormals(f, a);
		let p = e.radius, m = !1, h = ln, g = un, _ = dn, v = null, y = 0, b = 0, x = 0, S = null;
		for (let e = 0, t = f.length; e !== t && m === !1; e++) {
			let t = rn;
			t.copy(f[e]);
			let n = t.length();
			t.normalize();
			let r = nn.dot(t);
			if (r < n + p && r > 0) {
				let i = an, a = on;
				i.copy(f[(e + 1) % 3]), a.copy(f[(e + 2) % 3]);
				let o = i.length(), s = a.length();
				i.normalize(), a.normalize();
				let c = nn.dot(i), l = nn.dot(a);
				if (c < o && c > -o && l < s && l > -s) {
					let e = Math.abs(r - n - p);
					if ((S === null || e < S) && (S = e, b = c, x = l, v = n, h.copy(t), g.copy(i), _.copy(a), y++, u)) return !0;
				}
			}
		}
		if (y) {
			m = !0;
			let i = this.createContactEquation(o, s, e, t, c, l);
			h.scale(-p, i.ri), i.ni.copy(h), i.ni.negate(i.ni), h.scale(v, h), g.scale(b, g), h.vadd(g, h), _.scale(x, _), h.vadd(_, i.rj), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), i.rj.vadd(r, i.rj), i.rj.vsub(s.position, i.rj), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
		}
		let C = d.get(), w = cn;
		for (let i = 0; i !== 2 && !m; i++) for (let a = 0; a !== 2 && !m; a++) for (let d = 0; d !== 2 && !m; d++) if (C.set(0, 0, 0), i ? C.vadd(f[0], C) : C.vsub(f[0], C), a ? C.vadd(f[1], C) : C.vsub(f[1], C), d ? C.vadd(f[2], C) : C.vsub(f[2], C), r.vadd(C, w), w.vsub(n, w), w.lengthSquared() < p * p) {
			if (u) return !0;
			m = !0;
			let i = this.createContactEquation(o, s, e, t, c, l);
			i.ri.copy(w), i.ri.normalize(), i.ni.copy(i.ri), i.ri.scale(p, i.ri), i.rj.copy(C), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), i.rj.vadd(r, i.rj), i.rj.vsub(s.position, i.rj), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
		}
		d.release(C), C = null;
		let T = d.get(), E = d.get(), D = d.get(), O = d.get(), k = d.get(), ee = f.length;
		for (let i = 0; i !== ee && !m; i++) for (let a = 0; a !== ee && !m; a++) if (i % 3 != a % 3) {
			f[a].cross(f[i], T), T.normalize(), f[i].vadd(f[a], E), D.copy(n), D.vsub(E, D), D.vsub(r, D);
			let d = D.dot(T);
			T.scale(d, O);
			let h = 0;
			for (; h === i % 3 || h === a % 3;) h++;
			k.copy(n), k.vsub(O, k), k.vsub(E, k), k.vsub(r, k);
			let g = Math.abs(d), _ = k.length();
			if (g < f[h].length() && _ < p) {
				if (u) return !0;
				m = !0;
				let i = this.createContactEquation(o, s, e, t, c, l);
				E.vadd(O, i.rj), i.rj.copy(i.rj), k.negate(i.ni), i.ni.normalize(), i.ri.copy(i.rj), i.ri.vadd(r, i.ri), i.ri.vsub(n, i.ri), i.ri.normalize(), i.ri.scale(p, i.ri), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), i.rj.vadd(r, i.rj), i.rj.vsub(s.position, i.rj), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
			}
		}
		d.release(T, E, D, O, k);
	}
	planeBox(e, t, n, r, i, a, o, s, c, l, u) {
		return t.convexPolyhedronRepresentation.material = t.material, t.convexPolyhedronRepresentation.collisionResponse = t.collisionResponse, t.convexPolyhedronRepresentation.id = t.id, this.planeConvex(e, t.convexPolyhedronRepresentation, n, r, i, a, o, s, e, t, u);
	}
	convexConvex(e, t, n, r, i, a, o, s, c, l, u, d, f) {
		let p = En;
		if (!(n.distanceTo(r) > e.boundingSphereRadius + t.boundingSphereRadius) && e.findSeparatingAxis(t, n, i, r, a, p, d, f)) {
			let d = [], f = Dn;
			e.clipAgainstHull(n, i, t, r, a, p, -100, 100, d);
			let m = 0;
			for (let i = 0; i !== d.length; i++) {
				if (u) return !0;
				let a = this.createContactEquation(o, s, e, t, c, l), h = a.ri, g = a.rj;
				p.negate(a.ni), d[i].normal.negate(f), f.scale(d[i].depth, f), d[i].point.vadd(f, h), g.copy(d[i].point), h.vsub(n, h), g.vsub(r, g), h.vadd(n, h), h.vsub(o.position, h), g.vadd(r, g), g.vsub(s.position, g), this.result.push(a), m++, this.enableFrictionReduction || this.createFrictionEquationsFromContact(a, this.frictionResult);
			}
			this.enableFrictionReduction && m && this.createFrictionFromAverage(m);
		}
	}
	sphereConvex(e, t, n, r, i, a, o, s, c, l, u) {
		let d = this.v3pool;
		n.vsub(r, fn);
		let f = t.faceNormals, p = t.faces, m = t.vertices, h = e.radius, g = !1;
		for (let i = 0; i !== m.length; i++) {
			let d = m[i], f = gn;
			a.vmult(d, f), r.vadd(f, f);
			let p = hn;
			if (f.vsub(n, p), p.lengthSquared() < h * h) {
				if (u) return !0;
				g = !0;
				let i = this.createContactEquation(o, s, e, t, c, l);
				i.ri.copy(p), i.ri.normalize(), i.ni.copy(i.ri), i.ri.scale(h, i.ri), f.vsub(r, i.rj), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), i.rj.vadd(r, i.rj), i.rj.vsub(s.position, i.rj), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
				return;
			}
		}
		for (let i = 0, _ = p.length; i !== _ && g === !1; i++) {
			let _ = f[i], v = p[i], y = _n;
			a.vmult(_, y);
			let b = vn;
			a.vmult(m[v[0]], b), b.vadd(r, b);
			let x = yn;
			y.scale(-h, x), n.vadd(x, x);
			let S = bn;
			x.vsub(b, S);
			let C = S.dot(y), w = xn;
			if (n.vsub(b, w), C < 0 && w.dot(y) > 0) {
				let i = [];
				for (let e = 0, t = v.length; e !== t; e++) {
					let t = d.get();
					a.vmult(m[v[e]], t), r.vadd(t, t), i.push(t);
				}
				if (tn(i, y, n)) {
					if (u) return !0;
					g = !0;
					let a = this.createContactEquation(o, s, e, t, c, l);
					y.scale(-h, a.ri), y.negate(a.ni);
					let f = d.get();
					y.scale(-C, f);
					let p = d.get();
					y.scale(-h, p), n.vsub(r, a.rj), a.rj.vadd(p, a.rj), a.rj.vadd(f, a.rj), a.rj.vadd(r, a.rj), a.rj.vsub(s.position, a.rj), a.ri.vadd(n, a.ri), a.ri.vsub(o.position, a.ri), d.release(f), d.release(p), this.result.push(a), this.createFrictionEquationsFromContact(a, this.frictionResult);
					for (let e = 0, t = i.length; e !== t; e++) d.release(i[e]);
					return;
				} else for (let f = 0; f !== v.length; f++) {
					let p = d.get(), g = d.get();
					a.vmult(m[v[(f + 1) % v.length]], p), a.vmult(m[v[(f + 2) % v.length]], g), r.vadd(p, p), r.vadd(g, g);
					let _ = pn;
					g.vsub(p, _);
					let y = mn;
					_.unit(y);
					let b = d.get(), x = d.get();
					n.vsub(p, x);
					let S = x.dot(y);
					y.scale(S, b), b.vadd(p, b);
					let C = d.get();
					if (b.vsub(n, C), S > 0 && S * S < _.lengthSquared() && C.lengthSquared() < h * h) {
						if (u) return !0;
						let a = this.createContactEquation(o, s, e, t, c, l);
						b.vsub(r, a.rj), b.vsub(n, a.ni), a.ni.normalize(), a.ni.scale(h, a.ri), a.rj.vadd(r, a.rj), a.rj.vsub(s.position, a.rj), a.ri.vadd(n, a.ri), a.ri.vsub(o.position, a.ri), this.result.push(a), this.createFrictionEquationsFromContact(a, this.frictionResult);
						for (let e = 0, t = i.length; e !== t; e++) d.release(i[e]);
						d.release(p), d.release(g), d.release(b), d.release(C), d.release(x);
						return;
					}
					d.release(p), d.release(g), d.release(b), d.release(C), d.release(x);
				}
				for (let e = 0, t = i.length; e !== t; e++) d.release(i[e]);
			}
		}
	}
	planeConvex(e, t, n, r, i, a, o, s, c, l, u) {
		let d = Sn, f = Cn;
		f.set(0, 0, 1), i.vmult(f, f);
		let p = 0, m = wn;
		for (let i = 0; i !== t.vertices.length; i++) if (d.copy(t.vertices[i]), a.vmult(d, d), r.vadd(d, d), d.vsub(n, m), f.dot(m) <= 0) {
			if (u) return !0;
			let i = this.createContactEquation(o, s, e, t, c, l), a = Tn;
			f.scale(f.dot(m), a), d.vsub(a, a), a.vsub(n, i.ri), i.ni.copy(f), d.vsub(r, i.rj), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), i.rj.vadd(r, i.rj), i.rj.vsub(s.position, i.rj), this.result.push(i), p++, this.enableFrictionReduction || this.createFrictionEquationsFromContact(i, this.frictionResult);
		}
		this.enableFrictionReduction && p && this.createFrictionFromAverage(p);
	}
	boxConvex(e, t, n, r, i, a, o, s, c, l, u) {
		return e.convexPolyhedronRepresentation.material = e.material, e.convexPolyhedronRepresentation.collisionResponse = e.collisionResponse, this.convexConvex(e.convexPolyhedronRepresentation, t, n, r, i, a, o, s, e, t, u);
	}
	sphereHeightfield(e, t, n, r, i, a, o, s, c, l, u) {
		let d = t.data, f = e.radius, p = t.elementSize, m = Vn, h = Bn;
		_.pointToLocalFrame(r, a, n, h);
		let g = Math.floor((h.x - f) / p) - 1, v = Math.ceil((h.x + f) / p) + 1, y = Math.floor((h.y - f) / p) - 1, b = Math.ceil((h.y + f) / p) + 1;
		if (v < 0 || b < 0 || g > d.length || y > d[0].length) return;
		g < 0 && (g = 0), v < 0 && (v = 0), y < 0 && (y = 0), b < 0 && (b = 0), g >= d.length && (g = d.length - 1), v >= d.length && (v = d.length - 1), b >= d[0].length && (b = d[0].length - 1), y >= d[0].length && (y = d[0].length - 1);
		let x = [];
		t.getRectMinMax(g, y, v, b, x);
		let S = x[0], C = x[1];
		if (h.z - f > C || h.z + f < S) return;
		let w = this.result;
		for (let c = g; c < v; c++) for (let l = y; l < b; l++) {
			let d = w.length, f = !1;
			if (t.getConvexTrianglePillar(c, l, !1), _.pointToWorldFrame(r, a, t.pillarOffset, m), n.distanceTo(m) < t.pillarConvex.boundingSphereRadius + e.boundingSphereRadius && (f = this.sphereConvex(e, t.pillarConvex, n, m, i, a, o, s, e, t, u)), u && f || (t.getConvexTrianglePillar(c, l, !0), _.pointToWorldFrame(r, a, t.pillarOffset, m), n.distanceTo(m) < t.pillarConvex.boundingSphereRadius + e.boundingSphereRadius && (f = this.sphereConvex(e, t.pillarConvex, n, m, i, a, o, s, e, t, u)), u && f)) return !0;
			if (w.length - d > 2) return;
		}
	}
	boxHeightfield(e, t, n, r, i, a, o, s, c, l, u) {
		return e.convexPolyhedronRepresentation.material = e.material, e.convexPolyhedronRepresentation.collisionResponse = e.collisionResponse, this.convexHeightfield(e.convexPolyhedronRepresentation, t, n, r, i, a, o, s, e, t, u);
	}
	convexHeightfield(e, t, n, r, i, a, o, s, c, l, u) {
		let d = t.data, f = t.elementSize, p = e.boundingSphereRadius, m = Rn, h = zn, g = Ln;
		_.pointToLocalFrame(r, a, n, g);
		let v = Math.floor((g.x - p) / f) - 1, y = Math.ceil((g.x + p) / f) + 1, b = Math.floor((g.y - p) / f) - 1, x = Math.ceil((g.y + p) / f) + 1;
		if (y < 0 || x < 0 || v > d.length || b > d[0].length) return;
		v < 0 && (v = 0), y < 0 && (y = 0), b < 0 && (b = 0), x < 0 && (x = 0), v >= d.length && (v = d.length - 1), y >= d.length && (y = d.length - 1), x >= d[0].length && (x = d[0].length - 1), b >= d[0].length && (b = d[0].length - 1);
		let S = [];
		t.getRectMinMax(v, b, y, x, S);
		let C = S[0], w = S[1];
		if (!(g.z - p > w || g.z + p < C)) for (let c = v; c < y; c++) for (let l = b; l < x; l++) {
			let d = !1;
			if (t.getConvexTrianglePillar(c, l, !1), _.pointToWorldFrame(r, a, t.pillarOffset, m), n.distanceTo(m) < t.pillarConvex.boundingSphereRadius + e.boundingSphereRadius && (d = this.convexConvex(e, t.pillarConvex, n, m, i, a, o, s, null, null, u, h, null)), u && d || (t.getConvexTrianglePillar(c, l, !0), _.pointToWorldFrame(r, a, t.pillarOffset, m), n.distanceTo(m) < t.pillarConvex.boundingSphereRadius + e.boundingSphereRadius && (d = this.convexConvex(e, t.pillarConvex, n, m, i, a, o, s, null, null, u, h, null)), u && d)) return !0;
		}
	}
	sphereParticle(e, t, n, r, i, a, o, s, c, l, u) {
		let d = jn;
		if (d.set(0, 0, 1), r.vsub(n, d), d.lengthSquared() <= e.radius * e.radius) {
			if (u) return !0;
			let n = this.createContactEquation(s, o, t, e, c, l);
			d.normalize(), n.rj.copy(d), n.rj.scale(e.radius, n.rj), n.ni.copy(d), n.ni.negate(n.ni), n.ri.set(0, 0, 0), this.result.push(n), this.createFrictionEquationsFromContact(n, this.frictionResult);
		}
	}
	planeParticle(e, t, n, r, i, a, o, s, c, l, u) {
		let d = On;
		d.set(0, 0, 1), o.quaternion.vmult(d, d);
		let f = kn;
		if (r.vsub(o.position, f), d.dot(f) <= 0) {
			if (u) return !0;
			let n = this.createContactEquation(s, o, t, e, c, l);
			n.ni.copy(d), n.ni.negate(n.ni), n.ri.set(0, 0, 0);
			let i = An;
			d.scale(d.dot(r), i), r.vsub(i, i), n.rj.copy(i), this.result.push(n), this.createFrictionEquationsFromContact(n, this.frictionResult);
		}
	}
	boxParticle(e, t, n, r, i, a, o, s, c, l, u) {
		return e.convexPolyhedronRepresentation.material = e.material, e.convexPolyhedronRepresentation.collisionResponse = e.collisionResponse, this.convexParticle(e.convexPolyhedronRepresentation, t, n, r, i, a, o, s, e, t, u);
	}
	convexParticle(e, t, n, r, i, a, o, s, c, l, u) {
		let d = -1, f = Pn, p = In, m = null, h = Nn;
		if (h.copy(r), h.vsub(n, h), i.conjugate(Mn), Mn.vmult(h, h), e.pointIsInside(h)) {
			e.worldVerticesNeedsUpdate && e.computeWorldVertices(n, i), e.worldFaceNormalsNeedsUpdate && e.computeWorldFaceNormals(i);
			for (let t = 0, n = e.faces.length; t !== n; t++) {
				let n = [e.worldVertices[e.faces[t][0]]], i = e.worldFaceNormals[t];
				r.vsub(n[0], Fn);
				let a = -i.dot(Fn);
				if (m === null || Math.abs(a) < Math.abs(m)) {
					if (u) return !0;
					m = a, d = t, f.copy(i);
				}
			}
			if (d !== -1) {
				let i = this.createContactEquation(s, o, t, e, c, l);
				f.scale(m, p), p.vadd(r, p), p.vsub(n, p), i.rj.copy(p), f.negate(i.ni), i.ri.set(0, 0, 0);
				let a = i.ri, u = i.rj;
				a.vadd(r, a), a.vsub(s.position, a), u.vadd(n, u), u.vsub(o.position, u), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
			} else console.warn("Point found inside convex, but did not find penetrating face!");
		}
	}
	heightfieldCylinder(e, t, n, r, i, a, o, s, c, l, u) {
		return this.convexHeightfield(t, e, r, n, a, i, s, o, c, l, u);
	}
	particleCylinder(e, t, n, r, i, a, o, s, c, l, u) {
		return this.convexParticle(t, e, r, n, a, i, s, o, c, l, u);
	}
	sphereTrimesh(e, t, n, r, i, a, o, s, c, l, u) {
		let d = zt, f = Bt, p = Vt, m = Ht, h = Ut, g = Wt, v = Jt, y = Rt, b = It, x = Yt;
		_.pointToLocalFrame(r, a, n, h);
		let S = e.radius;
		v.lowerBound.set(h.x - S, h.y - S, h.z - S), v.upperBound.set(h.x + S, h.y + S, h.z + S), t.getTrianglesInAABB(v, x);
		let C = Lt, w = e.radius * e.radius;
		for (let i = 0; i < x.length; i++) for (let d = 0; d < 3; d++) if (t.getVertex(t.indices[x[i] * 3 + d], C), C.vsub(h, b), b.lengthSquared() <= w) {
			if (y.copy(C), _.pointToWorldFrame(r, a, y, C), C.vsub(n, b), u) return !0;
			let i = this.createContactEquation(o, s, e, t, c, l);
			i.ni.copy(b), i.ni.normalize(), i.ri.copy(i.ni), i.ri.scale(e.radius, i.ri), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), i.rj.copy(C), i.rj.vsub(s.position, i.rj), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
		}
		for (let i = 0; i < x.length; i++) for (let v = 0; v < 3; v++) {
			t.getVertex(t.indices[x[i] * 3 + v], d), t.getVertex(t.indices[x[i] * 3 + (v + 1) % 3], f), f.vsub(d, p), h.vsub(f, g);
			let y = g.dot(p);
			h.vsub(d, g);
			let b = g.dot(p);
			if (b > 0 && y < 0 && (h.vsub(d, g), m.copy(p), m.normalize(), b = g.dot(m), m.scale(b, g), g.vadd(d, g), g.distanceTo(h) < e.radius)) {
				if (u) return !0;
				let i = this.createContactEquation(o, s, e, t, c, l);
				g.vsub(h, i.ni), i.ni.normalize(), i.ni.scale(e.radius, i.ri), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), _.pointToWorldFrame(r, a, g, g), g.vsub(s.position, i.rj), _.vectorToWorldFrame(a, i.ni, i.ni), _.vectorToWorldFrame(a, i.ri, i.ri), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
			}
		}
		let T = Gt, E = Kt, D = qt, O = Ft;
		for (let i = 0, d = x.length; i !== d; i++) {
			t.getTriangleVertices(x[i], T, E, D), t.getNormal(x[i], O), h.vsub(T, g);
			let d = g.dot(O);
			if (O.scale(d, g), h.vsub(g, g), d = g.distanceTo(h), A.pointInTriangle(g, T, E, D) && d < e.radius) {
				if (u) return !0;
				let i = this.createContactEquation(o, s, e, t, c, l);
				g.vsub(h, i.ni), i.ni.normalize(), i.ni.scale(e.radius, i.ri), i.ri.vadd(n, i.ri), i.ri.vsub(o.position, i.ri), _.pointToWorldFrame(r, a, g, g), g.vsub(s.position, i.rj), _.vectorToWorldFrame(a, i.ni, i.ni), _.vectorToWorldFrame(a, i.ri, i.ri), this.result.push(i), this.createFrictionEquationsFromContact(i, this.frictionResult);
			}
		}
		x.length = 0;
	}
	planeTrimesh(e, t, n, i, a, o, s, c, l, u, d) {
		let f = new r(), p = Mt;
		p.set(0, 0, 1), a.vmult(p, p);
		for (let a = 0; a < t.vertices.length / 3; a++) {
			t.getVertex(a, f);
			let m = new r();
			m.copy(f), _.pointToWorldFrame(i, o, m, f);
			let h = Nt;
			if (f.vsub(n, h), p.dot(h) <= 0) {
				if (d) return !0;
				let n = this.createContactEquation(s, c, e, t, l, u);
				n.ni.copy(p);
				let r = Pt;
				p.scale(h.dot(p), r), f.vsub(r, r), n.ri.copy(r), n.ri.vsub(s.position, n.ri), n.rj.copy(f), n.rj.vsub(c.position, n.rj), this.result.push(n), this.createFrictionEquationsFromContact(n, this.frictionResult);
			}
		}
	}
}, H = new r(), U = new r(), W = new r(), Ot = new r(), kt = new r(), At = new f(), jt = new f(), Mt = new r(), Nt = new r(), Pt = new r(), Ft = new r(), It = new r();
new r();
var Lt = new r(), Rt = new r(), zt = new r(), Bt = new r(), Vt = new r(), Ht = new r(), Ut = new r(), Wt = new r(), Gt = new r(), Kt = new r(), qt = new r(), Jt = new s(), Yt = [], Xt = new r(), Zt = new r(), Qt = new r(), $t = new r(), en = new r();
function tn(e, t, n) {
	let r = null, i = e.length;
	for (let a = 0; a !== i; a++) {
		let o = e[a], s = Qt;
		e[(a + 1) % i].vsub(o, s);
		let c = $t;
		s.cross(t, c);
		let l = en;
		n.vsub(o, l);
		let u = c.dot(l);
		if (r === null || u > 0 && r === !0 || u <= 0 && r === !1) {
			r === null && (r = u > 0);
			continue;
		} else return !1;
	}
	return !0;
}
var nn = new r(), rn = new r(), an = new r(), on = new r(), sn = [
	new r(),
	new r(),
	new r(),
	new r(),
	new r(),
	new r()
], cn = new r(), ln = new r(), un = new r(), dn = new r(), fn = new r(), pn = new r(), mn = new r(), hn = new r(), gn = new r(), _n = new r(), vn = new r(), yn = new r(), bn = new r(), xn = new r();
new r(), new r();
var Sn = new r(), Cn = new r(), wn = new r(), Tn = new r(), En = new r(), Dn = new r(), On = new r(), kn = new r(), An = new r(), jn = new r(), Mn = new f(), Nn = new r();
new r();
var Pn = new r(), Fn = new r(), In = new r(), Ln = new r(), Rn = new r(), zn = [0], Bn = new r(), Vn = new r(), Hn = class {
	constructor() {
		this.current = [], this.previous = [];
	}
	getKey(e, t) {
		if (t < e) {
			let n = t;
			t = e, e = n;
		}
		return e << 16 | t;
	}
	set(e, t) {
		let n = this.getKey(e, t), r = this.current, i = 0;
		for (; n > r[i];) i++;
		if (n !== r[i]) {
			for (let e = r.length - 1; e >= i; e--) r[e + 1] = r[e];
			r[i] = n;
		}
	}
	tick() {
		let e = this.current;
		this.current = this.previous, this.previous = e, this.current.length = 0;
	}
	getDiff(e, t) {
		let n = this.current, r = this.previous, i = n.length, a = r.length, o = 0;
		for (let t = 0; t < i; t++) {
			let i = !1, a = n[t];
			for (; a > r[o];) o++;
			i = a === r[o], i || Un(e, a);
		}
		o = 0;
		for (let e = 0; e < a; e++) {
			let i = !1, a = r[e];
			for (; a > n[o];) o++;
			i = n[o] === a, i || Un(t, a);
		}
	}
};
function Un(e, t) {
	e.push((t & 4294901760) >> 16, t & 65535);
}
var Wn = (e, t) => e < t ? `${e}-${t}` : `${t}-${e}`, Gn = class {
	constructor() {
		this.data = { keys: [] };
	}
	get(e, t) {
		let n = Wn(e, t);
		return this.data[n];
	}
	set(e, t, n) {
		let r = Wn(e, t);
		this.get(e, t) || this.data.keys.push(r), this.data[r] = n;
	}
	delete(e, t) {
		let n = Wn(e, t), r = this.data.keys.indexOf(n);
		r !== -1 && this.data.keys.splice(r, 1), delete this.data[n];
	}
	reset() {
		let e = this.data, t = e.keys;
		for (; t.length > 0;) {
			let n = t.pop();
			delete e[n];
		}
	}
}, Kn = class extends d {
	constructor(e) {
		e === void 0 && (e = {}), super(), this.dt = -1, this.allowSleep = !!e.allowSleep, this.contacts = [], this.frictionEquations = [], this.quatNormalizeSkip = e.quatNormalizeSkip === void 0 ? 0 : e.quatNormalizeSkip, this.quatNormalizeFast = e.quatNormalizeFast === void 0 ? !1 : e.quatNormalizeFast, this.time = 0, this.stepnumber = 0, this.default_dt = 1 / 60, this.nextId = 0, this.gravity = new r(), e.gravity && this.gravity.copy(e.gravity), e.frictionGravity && (this.frictionGravity = new r(), this.frictionGravity.copy(e.frictionGravity)), this.broadphase = e.broadphase === void 0 ? new ve() : e.broadphase, this.bodies = [], this.hasActiveBodies = !1, this.solver = e.solver === void 0 ? new xt() : e.solver, this.constraints = [], this.narrowphase = new Dt(this), this.collisionMatrix = new u(), this.collisionMatrixPrevious = new u(), this.bodyOverlapKeeper = new Hn(), this.shapeOverlapKeeper = new Hn(), this.contactmaterials = [], this.contactMaterialTable = new Gn(), this.defaultMaterial = new R("default"), this.defaultContactMaterial = new L(this.defaultMaterial, this.defaultMaterial, {
			friction: .3,
			restitution: 0
		}), this.doProfiling = !1, this.profile = {
			solve: 0,
			makeContactConstraints: 0,
			broadphase: 0,
			integrate: 0,
			narrowphase: 0
		}, this.accumulator = 0, this.subsystems = [], this.addBodyEvent = {
			type: "addBody",
			body: null
		}, this.removeBodyEvent = {
			type: "removeBody",
			body: null
		}, this.idToBodyMap = {}, this.broadphase.setWorld(this);
	}
	getContactMaterial(e, t) {
		return this.contactMaterialTable.get(e.id, t.id);
	}
	collisionMatrixTick() {
		let e = this.collisionMatrixPrevious;
		this.collisionMatrixPrevious = this.collisionMatrix, this.collisionMatrix = e, this.collisionMatrix.reset(), this.bodyOverlapKeeper.tick(), this.shapeOverlapKeeper.tick();
	}
	addConstraint(e) {
		this.constraints.push(e);
	}
	removeConstraint(e) {
		let t = this.constraints.indexOf(e);
		t !== -1 && this.constraints.splice(t, 1);
	}
	rayTest(e, t, n) {
		n instanceof ye ? this.raycastClosest(e, t, { skipBackfaces: !0 }, n) : this.raycastAll(e, t, { skipBackfaces: !0 }, n);
	}
	raycastAll(e, t, n, r) {
		return n === void 0 && (n = {}), n.mode = A.ALL, n.from = e, n.to = t, n.callback = r, qn.intersectWorld(this, n);
	}
	raycastAny(e, t, n, r) {
		return n === void 0 && (n = {}), n.mode = A.ANY, n.from = e, n.to = t, n.result = r, qn.intersectWorld(this, n);
	}
	raycastClosest(e, t, n, r) {
		return n === void 0 && (n = {}), n.mode = A.CLOSEST, n.from = e, n.to = t, n.result = r, qn.intersectWorld(this, n);
	}
	addBody(e) {
		this.bodies.includes(e) || (e.index = this.bodies.length, this.bodies.push(e), e.world = this, e.initPosition.copy(e.position), e.initVelocity.copy(e.velocity), e.timeLastSleepy = this.time, e instanceof k && (e.initAngularVelocity.copy(e.angularVelocity), e.initQuaternion.copy(e.quaternion)), this.collisionMatrix.setNumObjects(this.bodies.length), this.addBodyEvent.body = e, this.idToBodyMap[e.id] = e, this.dispatchEvent(this.addBodyEvent));
	}
	removeBody(e) {
		e.world = null;
		let t = this.bodies.length - 1, n = this.bodies, r = n.indexOf(e);
		if (r !== -1) {
			n.splice(r, 1);
			for (let e = 0; e !== n.length; e++) n[e].index = e;
			this.collisionMatrix.setNumObjects(t), this.removeBodyEvent.body = e, delete this.idToBodyMap[e.id], this.dispatchEvent(this.removeBodyEvent);
		}
	}
	getBodyById(e) {
		return this.idToBodyMap[e];
	}
	getShapeById(e) {
		let t = this.bodies;
		for (let n = 0; n < t.length; n++) {
			let r = t[n].shapes;
			for (let t = 0; t < r.length; t++) {
				let n = r[t];
				if (n.id === e) return n;
			}
		}
		return null;
	}
	addContactMaterial(e) {
		this.contactmaterials.push(e), this.contactMaterialTable.set(e.materials[0].id, e.materials[1].id, e);
	}
	removeContactMaterial(e) {
		let t = this.contactmaterials.indexOf(e);
		t !== -1 && (this.contactmaterials.splice(t, 1), this.contactMaterialTable.delete(e.materials[0].id, e.materials[1].id));
	}
	fixedStep(e, t) {
		e === void 0 && (e = 1 / 60), t === void 0 && (t = 10);
		let n = G.now() / 1e3;
		if (!this.lastCallTime) this.step(e, void 0, t);
		else {
			let r = n - this.lastCallTime;
			this.step(e, r, t);
		}
		this.lastCallTime = n;
	}
	step(e, t, n) {
		if (n === void 0 && (n = 10), t === void 0) this.internalStep(e), this.time += e;
		else {
			this.accumulator += t;
			let r = G.now(), i = 0;
			for (; this.accumulator >= e && i < n && (this.internalStep(e), this.accumulator -= e, i++, !(G.now() - r > e * 1e3)););
			this.accumulator %= e;
			let a = this.accumulator / e;
			for (let e = 0; e !== this.bodies.length; e++) {
				let t = this.bodies[e];
				t.previousPosition.lerp(t.position, a, t.interpolatedPosition), t.previousQuaternion.slerp(t.quaternion, a, t.interpolatedQuaternion), t.previousQuaternion.normalize();
			}
			this.time += t;
		}
	}
	internalStep(e) {
		this.dt = e;
		let t = this.contacts, n = Qn, r = $n, i = this.bodies.length, a = this.bodies, o = this.solver, s = this.gravity, c = this.doProfiling, l = this.profile, u = k.DYNAMIC, d = -Infinity, f = this.constraints, p = Zn;
		s.length();
		let m = s.x, h = s.y, g = s.z, _ = 0;
		for (c && (d = G.now()), _ = 0; _ !== i; _++) {
			let e = a[_];
			if (e.type === u) {
				let t = e.force, n = e.mass;
				t.x += n * m, t.y += n * h, t.z += n * g;
			}
		}
		for (let e = 0, t = this.subsystems.length; e !== t; e++) this.subsystems[e].update();
		c && (d = G.now()), n.length = 0, r.length = 0, this.broadphase.collisionPairs(this, n, r), c && (l.broadphase = G.now() - d);
		let v = f.length;
		for (_ = 0; _ !== v; _++) {
			let e = f[_];
			if (!e.collideConnected) for (let t = n.length - 1; t >= 0; --t) (e.bodyA === n[t] && e.bodyB === r[t] || e.bodyB === n[t] && e.bodyA === r[t]) && (n.splice(t, 1), r.splice(t, 1));
		}
		this.collisionMatrixTick(), c && (d = G.now());
		let y = Xn, b = t.length;
		for (_ = 0; _ !== b; _++) y.push(t[_]);
		t.length = 0;
		let x = this.frictionEquations.length;
		for (_ = 0; _ !== x; _++) p.push(this.frictionEquations[_]);
		for (this.frictionEquations.length = 0, this.narrowphase.getContacts(n, r, this, t, y, this.frictionEquations, p), c && (l.narrowphase = G.now() - d), c && (d = G.now()), _ = 0; _ < this.frictionEquations.length; _++) o.addEquation(this.frictionEquations[_]);
		let S = t.length;
		for (let e = 0; e !== S; e++) {
			let n = t[e], r = n.bi, i = n.bj, a = n.si, s = n.sj, c;
			c = r.material && i.material && this.getContactMaterial(r.material, i.material) || this.defaultContactMaterial, c.friction, r.material && i.material && (r.material.friction >= 0 && i.material.friction >= 0 && r.material.friction * i.material.friction, r.material.restitution >= 0 && i.material.restitution >= 0 && (n.restitution = r.material.restitution * i.material.restitution)), o.addEquation(n), r.allowSleep && r.type === k.DYNAMIC && r.sleepState === k.SLEEPING && i.sleepState === k.AWAKE && i.type !== k.STATIC && i.velocity.lengthSquared() + i.angularVelocity.lengthSquared() >= i.sleepSpeedLimit ** 2 * 2 && (r.wakeUpAfterNarrowphase = !0), i.allowSleep && i.type === k.DYNAMIC && i.sleepState === k.SLEEPING && r.sleepState === k.AWAKE && r.type !== k.STATIC && r.velocity.lengthSquared() + r.angularVelocity.lengthSquared() >= r.sleepSpeedLimit ** 2 * 2 && (i.wakeUpAfterNarrowphase = !0), this.collisionMatrix.set(r, i, !0), this.collisionMatrixPrevious.get(r, i) || (K.body = i, K.contact = n, r.dispatchEvent(K), K.body = r, i.dispatchEvent(K)), this.bodyOverlapKeeper.set(r.id, i.id), this.shapeOverlapKeeper.set(a.id, s.id);
		}
		for (this.emitContactEvents(), c && (l.makeContactConstraints = G.now() - d, d = G.now()), _ = 0; _ !== i; _++) {
			let e = a[_];
			e.wakeUpAfterNarrowphase &&= (e.wakeUp(), !1);
		}
		for (v = f.length, _ = 0; _ !== v; _++) {
			let e = f[_];
			e.update();
			for (let t = 0, n = e.equations.length; t !== n; t++) {
				let n = e.equations[t];
				o.addEquation(n);
			}
		}
		o.solve(e, this), c && (l.solve = G.now() - d), o.removeAllEquations();
		let C = Math.pow;
		for (_ = 0; _ !== i; _++) {
			let t = a[_];
			if (t.type & u) {
				let n = C(1 - t.linearDamping, e), r = t.velocity;
				r.scale(n, r);
				let i = t.angularVelocity;
				if (i) {
					let n = C(1 - t.angularDamping, e);
					i.scale(n, i);
				}
			}
		}
		this.dispatchEvent(Yn), c && (d = G.now());
		let w = this.stepnumber % (this.quatNormalizeSkip + 1) === 0, T = this.quatNormalizeFast;
		for (_ = 0; _ !== i; _++) a[_].integrate(e, w, T);
		this.clearForces(), this.broadphase.dirty = !0, c && (l.integrate = G.now() - d), this.stepnumber += 1, this.dispatchEvent(Jn);
		let E = !0;
		if (this.allowSleep) for (E = !1, _ = 0; _ !== i; _++) {
			let e = a[_];
			e.sleepTick(this.time), e.sleepState !== k.SLEEPING && (E = !0);
		}
		this.hasActiveBodies = E;
	}
	emitContactEvents() {
		let e = this.hasAnyEventListener("beginContact"), t = this.hasAnyEventListener("endContact");
		if ((e || t) && this.bodyOverlapKeeper.getDiff(q, J), e) {
			for (let e = 0, t = q.length; e < t; e += 2) Y.bodyA = this.getBodyById(q[e]), Y.bodyB = this.getBodyById(q[e + 1]), this.dispatchEvent(Y);
			Y.bodyA = Y.bodyB = null;
		}
		if (t) {
			for (let e = 0, t = J.length; e < t; e += 2) X.bodyA = this.getBodyById(J[e]), X.bodyB = this.getBodyById(J[e + 1]), this.dispatchEvent(X);
			X.bodyA = X.bodyB = null;
		}
		q.length = J.length = 0;
		let n = this.hasAnyEventListener("beginShapeContact"), r = this.hasAnyEventListener("endShapeContact");
		if ((n || r) && this.shapeOverlapKeeper.getDiff(q, J), n) {
			for (let e = 0, t = q.length; e < t; e += 2) {
				let t = this.getShapeById(q[e]), n = this.getShapeById(q[e + 1]);
				Z.shapeA = t, Z.shapeB = n, t && (Z.bodyA = t.body), n && (Z.bodyB = n.body), this.dispatchEvent(Z);
			}
			Z.bodyA = Z.bodyB = Z.shapeA = Z.shapeB = null;
		}
		if (r) {
			for (let e = 0, t = J.length; e < t; e += 2) {
				let t = this.getShapeById(J[e]), n = this.getShapeById(J[e + 1]);
				Q.shapeA = t, Q.shapeB = n, t && (Q.bodyA = t.body), n && (Q.bodyB = n.body), this.dispatchEvent(Q);
			}
			Q.bodyA = Q.bodyB = Q.shapeA = Q.shapeB = null;
		}
	}
	clearForces() {
		let e = this.bodies, t = e.length;
		for (let n = 0; n !== t; n++) {
			let t = e[n];
			t.force, t.torque, t.force.set(0, 0, 0), t.torque.set(0, 0, 0);
		}
	}
};
new s();
var qn = new A(), G = globalThis.performance || {};
if (!G.now) {
	let e = Date.now();
	G.timing && G.timing.navigationStart && (e = G.timing.navigationStart), G.now = () => Date.now() - e;
}
new r();
var Jn = { type: "postStep" }, Yn = { type: "preStep" }, K = {
	type: k.COLLIDE_EVENT_NAME,
	body: null,
	contact: null
}, Xn = [], Zn = [], Qn = [], $n = [], q = [], J = [], Y = {
	type: "beginContact",
	bodyA: null,
	bodyB: null
}, X = {
	type: "endContact",
	bodyA: null,
	bodyB: null
}, Z = {
	type: "beginShapeContact",
	bodyA: null,
	bodyB: null,
	shapeA: null,
	shapeB: null
}, Q = {
	type: "endShapeContact",
	bodyA: null,
	bodyB: null,
	shapeA: null,
	shapeB: null
}, er = class {
	constructor(e) {
		typeof e == "object" && (e = e.notation), this.set = [], this.setkeys = [], this.setid = 0, this.groups = [], this.totalDice = 0, this.op = "", this.constant = null, this.result = [], this.error = !1, this.boost = 1, this.notation = "", this.vectors = [], (!e || e == "0") && (this.error = !0), this.parseNotation(e);
	}
	parseNotation(e) {
		if (e) {
			let t = e.split("!").length - 1 || 0;
			t > 0 && (this.boost = Math.min(Math.max(t, 0), 3) * 4), e = e.split("!").join(""), e = e.split(" ").join(""), e.split("(").length - 1 != e.split(")").length - 1 && (this.error = !0);
		}
		let t = this.notation.length > 0 ? "+" : "";
		this.notation += t + e;
		let n = e.split("@"), r = n[0], i = /* @__PURE__ */ new RegExp(/(\+|\-|\*|\/|\%|\^|){0,1}()(\d*)([a-z]+\d+|[a-z]+|)(?:\{([a-z]+)(.*?|)\}|)()/, "i"), a = /* @__PURE__ */ new RegExp(/(\b)*(\-\d+|\d+)(\b)*/, "gi"), o, s = 0, c = 0, l = 0;
		for (; !this.error && r.length > 0 && (o = i.exec(r)) !== null && s < 30;) {
			s++, r = r.substring(o[0].length);
			let e = o[1], t = o[2] && o[2].length > 0, n = o[3], i = o[4], a = o[5] || "", u = o[6] || "", d = o[7] && o[7].length > 0, f = !0;
			t && (c += o[2].length), u = u.split(","), (!u || u.length < 1) && (u = ""), u.shift(), s == 1 && r.length == 0 && !i && e && n ? (i = "d20", this.op = e, this.constant = parseInt(n), n = 1) : s > 1 && r.length == 0 && !i && (this.op = e, this.constant = parseInt(n), f = !1), f && this.addSet(n, i, l, c, a, u, e), d && (c -= o[7].length, l += o[7].length);
		}
		!this.error && n[1] && (o = n[1].match(a)) !== null && this.result.push(...o);
	}
	stringify(e = !0) {
		let t = "";
		if (this.set.length < 1) return t;
		for (let e = 0; e < this.set.length; e++) {
			let n = this.set[e];
			t += e > 0 && n.op ? n.op : "", t += n.num + n.type, n.func && (t += "{", t += n.func ? n.func : "", t += n.args ? "," + (Array.isArray(n.args) ? n.args.join(",") : n.args) : "", t += "}");
		}
		return t += this.constant ? this.op + "" + Math.abs(this.constant) : "", e && this.result && this.result.length > 0 && (t += "@" + this.result.join(",")), this.boost > 1 && (t += "!".repeat(this.boost / 4)), t;
	}
	addSet(e, t, n = 0, r = 0, i = "", a = "", o = "+") {
		e = Math.abs(parseInt(e || 1));
		let s = o + "" + t + n + r + i + a, c = this.setkeys[s] != null, l = {};
		c && (l = this.set[this.setkeys[s] - 1]), e > 0 && (l.num = c ? e + l.num : e, l.type = t, l.sid = this.setid, l.gid = n, l.glvl = r, i && (l.func = i), a && (l.args = a), o && (l.op = o), c ? this.set[this.setkeys[s] - 1] = l : this.setkeys[s] = this.set.push(l)), c || ++this.setid;
	}
	static mergeNotation(e, t) {
		return {
			...e,
			constant: e.constant + t.constant,
			notation: e.notation + "+" + t.notation,
			set: [...e.set, ...t.set],
			totalDice: e.vectors.length + t.vectors.length,
			vectors: [...e.vectors, ...t.vectors]
		};
	}
}, tr = {
	d2: {
		name: "d2",
		labels: ["1", "2"],
		values: [1, 2],
		inertia: 8,
		mass: 400,
		scale: .9,
		system: "dweird"
	},
	dc: {
		type: "d2",
		name: "Coin",
		labels: ["textures/silvercoin/tail.png", "textures/silvercoin/heads.png"],
		setBumpMaps: ["textures/silvercoin/tail_bump.png", "textures/silvercoin/heads_bump.png"],
		values: [0, 1],
		inertia: 8,
		mass: 400,
		scale: .9,
		colorset: "coin_silver"
	},
	d1: {
		name: "One-sided Dice",
		type: "d6",
		labels: ["1"],
		values: [1, 1],
		scale: .9,
		system: "dweird"
	},
	d3: {
		name: "Three-Sided Dice",
		type: "d6",
		labels: [
			"1",
			"2",
			"3"
		],
		values: [1, 3],
		scale: .9,
		system: "dweird"
	},
	df: {
		name: "Fudge Dice",
		type: "d6",
		labels: [
			"-",
			"0",
			"+"
		],
		values: [-1, 1],
		scale: .9,
		system: "dweird"
	},
	d4: {
		name: "Four-Sided Dice",
		labels: [
			"1",
			"2",
			"3",
			"4"
		],
		values: [1, 4],
		inertia: 5,
		scale: 1.2
	},
	d6: {
		name: "Six-Sided Dice (Numbers)",
		labels: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6"
		],
		values: [1, 6],
		scale: .9
	},
	dpip: {
		name: "Six-Sided Dice (Pips)",
		type: "d6",
		labels: [
			"   \n ⬤ \n   ",
			"⬤  \n   \n  ⬤",
			"⬤  \n ⬤ \n  ⬤",
			"⬤ ⬤\n   \n⬤ ⬤",
			"⬤ ⬤\n ⬤ \n⬤ ⬤",
			"⬤ ⬤\n⬤ ⬤\n⬤ ⬤"
		],
		values: [1, 6],
		scale: .9,
		font: "monospace"
	},
	dsex: {
		name: "Sex-Sided Emoji Dice",
		type: "d6",
		labels: [
			"🍆",
			"🍑",
			"👌",
			"💦",
			"🙏",
			"💥"
		],
		values: [1, 6],
		scale: .9,
		display: "labels",
		system: "dweird"
	},
	dpoker: {
		name: "Poker Dice (9-Ace)",
		type: "d6",
		labels: [
			"A",
			"9",
			"10",
			"J",
			"Q",
			"K"
		],
		values: [1, 6],
		scale: .9,
		display: "labels",
		system: "dweird",
		font: "Times New Roman"
	},
	dspanpoker: {
		name: "Spanish Poker Dice (7-Ace)",
		type: "d8",
		labels: [
			"A",
			"7",
			"8",
			"9",
			"10",
			"J",
			"Q",
			"K"
		],
		values: [1, 8],
		display: "labels",
		system: "dweird",
		font: "Times New Roman"
	},
	disotope: {
		name: "Radioactive Twelve-Sided Dice",
		type: "d12",
		labels: [
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"",
			"☢️"
		],
		values: [
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			0,
			1
		],
		mass: 350,
		inertia: 8,
		scale: .9,
		system: "dweird"
	},
	dsuit: {
		name: "Four-Suited Dice",
		type: "d4",
		labels: [
			"♠️",
			"♥️",
			"♦️",
			"♣️"
		],
		values: [1, 4],
		inertia: 5,
		scale: 1.2,
		display: "labels",
		system: "dweird"
	},
	d8: {
		name: "Eight-Sided Dice",
		labels: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8"
		],
		values: [1, 8]
	},
	d10: {
		name: "Ten-Sided Dice (Single Digit)",
		labels: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"0"
		],
		values: [1, 10],
		mass: 350,
		inertia: 9,
		scale: .9
	},
	d100: {
		name: "Ten-Sided Dice (Tens Digit)",
		type: "d10",
		labels: [
			"10",
			"20",
			"30",
			"40",
			"50",
			"60",
			"70",
			"80",
			"90",
			"00"
		],
		values: [
			10,
			100,
			10
		],
		mass: 350,
		inertia: 9,
		scale: .9
	},
	d12: {
		name: "Twelve-Sided Dice",
		labels: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12"
		],
		values: [1, 12],
		mass: 350,
		inertia: 8,
		scale: .9
	},
	d20: {
		name: "Twenty-Sided Dice",
		labels: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"10",
			"11",
			"12",
			"13",
			"14",
			"15",
			"16",
			"17",
			"18",
			"19",
			"20"
		],
		values: [1, 20],
		mass: 400,
		inertia: 6
	},
	dabi: {
		name: "Star Wars RPG: Ability Dice",
		type: "d8",
		labels: [
			"s",
			"a",
			"s\na",
			"s\ns",
			"a",
			"s",
			"a\na",
			""
		],
		values: [1, 8],
		font: "SWRPG-Symbol-Regular",
		color: "#00FF00",
		colorset: "swrpg_abi",
		display: "labels",
		system: "swrpg"
	},
	ddif: {
		name: "Star Wars RPG: Difficulty Dice",
		type: "d8",
		labels: [
			"t",
			"f",
			"f\nt",
			"t",
			"",
			"t\nt",
			"f\nf",
			"t"
		],
		values: [1, 8],
		font: "SWRPG-Symbol-Regular",
		color: "#8000FC",
		colorset: "swrpg_dif",
		display: "labels",
		system: "swrpg"
	},
	dpro: {
		name: "Star Wars RPG: Proficiency Dice",
		type: "d12",
		labels: [
			"a\na",
			"a",
			"a\na",
			"x",
			"s",
			"s\na",
			"s",
			"s\na",
			"s\ns",
			"s\na",
			"s\ns",
			""
		],
		values: [1, 12],
		mass: 350,
		inertia: 8,
		scale: .9,
		font: "SWRPG-Symbol-Regular",
		color: "#FFFF00",
		colorset: "swrpg_pro",
		display: "labels",
		system: "swrpg"
	},
	dcha: {
		name: "Star Wars RPG: Challenge Dice",
		type: "d12",
		labels: [
			"t\nt",
			"t",
			"t\nt",
			"t",
			"t\nf",
			"f",
			"t\nf",
			"f",
			"f\nf",
			"y",
			"f\nf",
			""
		],
		values: [1, 12],
		mass: 350,
		inertia: 8,
		scale: .9,
		font: "SWRPG-Symbol-Regular",
		color: "#FF0000",
		colorset: "swrpg_cha",
		display: "labels",
		system: "swrpg"
	},
	dfor: {
		name: "Star Wars RPG: Force Dice",
		type: "d12",
		labels: [
			"z",
			"Z\nZ",
			"z",
			"Z\nZ",
			"z",
			"Z\nZ",
			"z",
			"Z",
			"z",
			"Z",
			"z",
			"z\nz"
		],
		values: [1, 12],
		mass: 350,
		inertia: 8,
		scale: .9,
		font: "SWRPG-Symbol-Regular",
		color: "#FFFFFF",
		colorset: "swrpg_for",
		display: "labels",
		system: "swrpg"
	},
	dboo: {
		name: "Star Wars RPG: Boost Dice",
		type: "d6",
		labels: [
			"s  \n  a",
			"a  \n  a",
			"s",
			"a",
			"",
			""
		],
		values: [1, 6],
		scale: .9,
		font: "SWRPG-Symbol-Regular",
		color: "#00FFFF",
		colorset: "swrpg_boo",
		display: "labels",
		system: "swrpg"
	},
	dset: {
		name: "Star Wars RPG: Setback Dice",
		type: "d6",
		labels: [
			"",
			"t",
			"f"
		],
		values: [1, 3],
		scale: .9,
		font: "SWRPG-Symbol-Regular",
		color: "#111111",
		colorset: "swrpg_set",
		display: "labels",
		system: "swrpg"
	},
	swar: {
		name: "Star Wars Armada: Red Attack Dice",
		type: "d8",
		labels: [
			"F",
			"F",
			"F\nF",
			"E",
			"E",
			"G",
			"",
			""
		],
		values: [1, 8],
		font: "Armada-Symbol-Regular",
		color: "#FF0000",
		colorset: "swa_red",
		display: "labels",
		system: "swarmada"
	},
	swab: {
		name: "Star Wars Armada: Blue Attack Dice",
		type: "d8",
		labels: [
			"F",
			"F",
			"F",
			"F",
			"E",
			"E",
			"G",
			"G"
		],
		values: [1, 8],
		font: "Armada-Symbol-Regular",
		color: "#0000FF",
		colorset: "swa_blue",
		display: "labels",
		system: "swarmada"
	},
	swak: {
		name: "Star Wars Armada: Black Attack Dice",
		type: "d8",
		labels: [
			"F",
			"F",
			"F",
			"F",
			"F\nE",
			"F\nE",
			"",
			""
		],
		values: [1, 8],
		font: "Armada-Symbol-Regular",
		color: "#111111",
		colorset: "swa_black",
		display: "labels",
		system: "swarmada"
	},
	xwatk: {
		name: "Star Wars X-Wing: Red Attack Dice",
		type: "d8",
		labels: [
			"c",
			"d",
			"d",
			"d",
			"f",
			"f",
			"",
			""
		],
		values: [1, 8],
		font: "XWing-Symbol-Regular",
		color: "#FF0000",
		colorset: "xwing_red",
		display: "labels",
		system: "xwing"
	},
	xwdef: {
		name: "Star Wars X-Wing: Green Defense Dice",
		type: "d8",
		labels: [
			"e",
			"e",
			"e",
			"f",
			"f",
			"",
			"",
			""
		],
		values: [1, 8],
		font: "XWing-Symbol-Regular",
		color: "#00FF00",
		colorset: "xwing_green",
		display: "labels",
		system: "xwing"
	},
	swlar: {
		name: "Star Wars Legion: Red Attack Dice",
		type: "d8",
		labels: [
			"h",
			"h",
			"h",
			"h",
			"h",
			"c",
			"o",
			""
		],
		values: [1, 8],
		font: "Legion-Symbol-Regular",
		color: "#FF0000",
		colorset: "swl_atkred",
		display: "labels",
		system: "legion"
	},
	swlab: {
		name: "Star Wars Legion: Black Attack Dice",
		type: "d8",
		labels: [
			"h",
			"h",
			"h",
			"",
			"",
			"c",
			"o",
			""
		],
		values: [1, 8],
		font: "Legion-Symbol-Regular",
		color: "#111111",
		colorset: "swl_atkblack",
		display: "labels",
		system: "legion"
	},
	swlaw: {
		name: "Star Wars Legion: White Attack Dice",
		type: "d8",
		labels: [
			"h",
			"",
			"",
			"",
			"",
			"c",
			"o",
			""
		],
		values: [1, 8],
		font: "Legion-Symbol-Regular",
		color: "#FFFFFF",
		colorset: "swl_atkwhite",
		display: "labels",
		system: "legion"
	},
	swldr: {
		name: "Star Wars Legion: Red Defense Dice",
		type: "d6",
		labels: [
			"s",
			"s",
			"s",
			"d",
			"",
			""
		],
		values: [1, 6],
		scale: .9,
		font: "Legion-Symbol-Regular",
		color: "#FF0000",
		colorset: "swl_defred",
		display: "labels",
		system: "legion"
	},
	swldw: {
		name: "Star Wars Legion: White Defense Dice",
		type: "d6",
		labels: [
			"s",
			"",
			"",
			"d",
			"",
			""
		],
		values: [1, 6],
		scale: .9,
		font: "Legion-Symbol-Regular",
		color: "#FFFFFF",
		colorset: "swl_defwhite",
		display: "labels",
		system: "legion"
	}
}, $ = {
	d4: {
		vertices: [
			[
				1,
				1,
				1
			],
			[
				-1,
				-1,
				1
			],
			[
				-1,
				1,
				-1
			],
			[
				1,
				-1,
				-1
			]
		],
		faces: [
			[
				1,
				0,
				2,
				1
			],
			[
				0,
				1,
				3,
				2
			],
			[
				0,
				3,
				2,
				3
			],
			[
				1,
				2,
				3,
				4
			]
		]
	},
	d6: {
		vertices: [
			[
				-1,
				-1,
				-1
			],
			[
				1,
				-1,
				-1
			],
			[
				1,
				1,
				-1
			],
			[
				-1,
				1,
				-1
			],
			[
				-1,
				-1,
				1
			],
			[
				1,
				-1,
				1
			],
			[
				1,
				1,
				1
			],
			[
				-1,
				1,
				1
			]
		],
		faces: [
			[
				0,
				3,
				2,
				1,
				1
			],
			[
				1,
				2,
				6,
				5,
				2
			],
			[
				0,
				1,
				5,
				4,
				3
			],
			[
				3,
				7,
				6,
				2,
				4
			],
			[
				0,
				4,
				7,
				3,
				5
			],
			[
				4,
				5,
				6,
				7,
				6
			]
		]
	},
	d8: {
		vertices: [
			[
				1,
				0,
				0
			],
			[
				-1,
				0,
				0
			],
			[
				0,
				1,
				0
			],
			[
				0,
				-1,
				0
			],
			[
				0,
				0,
				1
			],
			[
				0,
				0,
				-1
			]
		],
		faces: [
			[
				0,
				2,
				4,
				1
			],
			[
				0,
				4,
				3,
				2
			],
			[
				0,
				3,
				5,
				3
			],
			[
				0,
				5,
				2,
				4
			],
			[
				1,
				3,
				4,
				5
			],
			[
				1,
				4,
				2,
				6
			],
			[
				1,
				2,
				5,
				7
			],
			[
				1,
				5,
				3,
				8
			]
		]
	},
	d10: {
		vertices: [
			[
				1,
				0,
				-.105
			],
			[
				.809,
				.5877,
				.105
			],
			[
				.309,
				.951,
				-.105
			],
			[
				-.309,
				.951,
				.105
			],
			[
				-.809,
				.5877,
				-.105
			],
			[
				-1,
				0,
				.105
			],
			[
				-.809,
				-.587,
				-.105
			],
			[
				-.309,
				-.951,
				.105
			],
			[
				.309,
				-.951,
				-.105
			],
			[
				.809,
				-.5877,
				.105
			],
			[
				0,
				0,
				-1
			],
			[
				0,
				0,
				1
			]
		],
		faces: [
			[
				5,
				6,
				7,
				11,
				0
			],
			[
				4,
				3,
				2,
				10,
				1
			],
			[
				1,
				2,
				3,
				11,
				2
			],
			[
				0,
				9,
				8,
				10,
				3
			],
			[
				7,
				8,
				9,
				11,
				4
			],
			[
				8,
				7,
				6,
				10,
				5
			],
			[
				9,
				0,
				1,
				11,
				6
			],
			[
				2,
				1,
				0,
				10,
				7
			],
			[
				3,
				4,
				5,
				11,
				8
			],
			[
				6,
				5,
				4,
				10,
				9
			]
		]
	},
	d12: {
		vertices: [
			[
				0,
				.618,
				1.618
			],
			[
				0,
				.618,
				-1.618
			],
			[
				0,
				-.618,
				1.618
			],
			[
				0,
				-.618,
				-1.618
			],
			[
				1.618,
				0,
				.618
			],
			[
				1.618,
				0,
				-.618
			],
			[
				-1.618,
				0,
				.618
			],
			[
				-1.618,
				0,
				-.618
			],
			[
				.618,
				1.618,
				0
			],
			[
				.618,
				-1.618,
				0
			],
			[
				-.618,
				1.618,
				0
			],
			[
				-.618,
				-1.618,
				0
			],
			[
				1,
				1,
				1
			],
			[
				1,
				1,
				-1
			],
			[
				1,
				-1,
				1
			],
			[
				1,
				-1,
				-1
			],
			[
				-1,
				1,
				1
			],
			[
				-1,
				1,
				-1
			],
			[
				-1,
				-1,
				1
			],
			[
				-1,
				-1,
				-1
			]
		],
		faces: [
			[
				2,
				14,
				4,
				12,
				0,
				1
			],
			[
				15,
				9,
				11,
				19,
				3,
				2
			],
			[
				16,
				10,
				17,
				7,
				6,
				3
			],
			[
				6,
				7,
				19,
				11,
				18,
				4
			],
			[
				6,
				18,
				2,
				0,
				16,
				5
			],
			[
				18,
				11,
				9,
				14,
				2,
				6
			],
			[
				1,
				17,
				10,
				8,
				13,
				7
			],
			[
				1,
				13,
				5,
				15,
				3,
				8
			],
			[
				13,
				8,
				12,
				4,
				5,
				9
			],
			[
				5,
				4,
				14,
				9,
				15,
				10
			],
			[
				0,
				12,
				8,
				10,
				16,
				11
			],
			[
				3,
				19,
				7,
				17,
				1,
				12
			]
		]
	},
	d20: {
		vertices: [
			[
				-1,
				1.618,
				0
			],
			[
				1,
				1.618,
				0
			],
			[
				-1,
				-1.618,
				0
			],
			[
				1,
				-1.618,
				0
			],
			[
				0,
				-1,
				1.618
			],
			[
				0,
				1,
				1.618
			],
			[
				0,
				-1,
				-1.618
			],
			[
				0,
				1,
				-1.618
			],
			[
				1.618,
				0,
				-1
			],
			[
				1.618,
				0,
				1
			],
			[
				-1.618,
				0,
				-1
			],
			[
				-1.618,
				0,
				1
			]
		],
		faces: [
			[
				0,
				11,
				5,
				1
			],
			[
				0,
				5,
				1,
				2
			],
			[
				0,
				1,
				7,
				3
			],
			[
				0,
				7,
				10,
				4
			],
			[
				0,
				10,
				11,
				5
			],
			[
				1,
				5,
				9,
				6
			],
			[
				5,
				11,
				4,
				7
			],
			[
				11,
				10,
				2,
				8
			],
			[
				10,
				7,
				6,
				9
			],
			[
				7,
				1,
				8,
				10
			],
			[
				3,
				9,
				4,
				11
			],
			[
				3,
				4,
				2,
				12
			],
			[
				3,
				2,
				6,
				13
			],
			[
				3,
				6,
				8,
				14
			],
			[
				3,
				8,
				9,
				15
			],
			[
				4,
				9,
				5,
				16
			],
			[
				2,
				4,
				11,
				17
			],
			[
				6,
				2,
				10,
				18
			],
			[
				8,
				6,
				7,
				19
			],
			[
				9,
				8,
				1,
				20
			]
		]
	}
}, nr = {
	name: "",
	scale: 1,
	font: "Arial",
	color: "",
	labels: [],
	valueMap: [],
	values: [],
	normals: [],
	mass: 300,
	inertia: 13,
	geometry: null,
	display: "values",
	system: "d20"
}, rr = class {
	constructor(e) {
		if (!tr.hasOwnProperty(e)) return console.error("dice type unavailable");
		Object.assign(this, nr, tr[e]), this.shape = tr[e].type || e, this.type = e, this.setLabels(this.labels), this.setValues(this.values[0], this.values[1], this.values[2]), this.setValueMap(this.valueMap), this.bumpMaps && this.setBumpMaps(this.bumpMaps);
	}
	setValues(e = 1, t = 20, n = 1) {
		this.values = this.range(e, t, n);
	}
	setValueMap(e) {
		for (let t = 0; t < this.values.length; t++) {
			let n = this.values[t];
			e[n] != null && (this.valueMap[n] = e[n]);
		}
	}
	registerFaces(e, t = "labels") {
		let n;
		if (n = t == "labels" ? this.labels : this.normals, n.unshift(""), ["d2", "d10"].includes(this.shape) || n.unshift(""), this.shape == "d4") {
			let t = e[0], n = e[1], r = e[2], i = e[3];
			this.labels = [
				[
					[],
					[
						0,
						0,
						0
					],
					[
						n,
						i,
						r
					],
					[
						t,
						r,
						i
					],
					[
						n,
						t,
						i
					],
					[
						t,
						n,
						r
					]
				],
				[
					[],
					[
						0,
						0,
						0
					],
					[
						n,
						r,
						i
					],
					[
						r,
						t,
						i
					],
					[
						n,
						i,
						t
					],
					[
						r,
						n,
						t
					]
				],
				[
					[],
					[
						0,
						0,
						0
					],
					[
						i,
						r,
						n
					],
					[
						r,
						i,
						t
					],
					[
						i,
						n,
						t
					],
					[
						r,
						t,
						n
					]
				],
				[
					[],
					[
						0,
						0,
						0
					],
					[
						i,
						n,
						r
					],
					[
						t,
						i,
						r
					],
					[
						i,
						t,
						n
					],
					[
						t,
						r,
						n
					]
				]
			];
		} else Array.prototype.push.apply(n, e);
	}
	setLabels(e) {
		this.loadTextures(e, this.registerFaces.bind(this), "labels");
	}
	setBumpMaps(e) {
		this.loadTextures(e, this.registerFaces.bind(this), "bump");
	}
	loadTextures(e, t, n) {
		let r = 0, i = e.length, a = /\.(PNG|JPG|GIF|WEBP)$/i, o = Array(e.length), s = !1;
		for (let c = 0; c < i; c++) {
			if (e[c] == "" || !e[c].match(a)) {
				o[c] = e[c], ++r;
				continue;
			}
			s = !0, o[c] = new Image(), o[c].onload = function() {
				++r >= i && t(o, n);
			}, o[c].src = e[c];
		}
		s || t(o, n);
	}
	range(e, t, n = 1) {
		for (var r = [e], i = e; i < t;) r.push(i += n || 1);
		return r;
	}
}, ir = {
	none: { name: "Plastic" },
	perfectmetal: {
		name: "Perfect Metal",
		color: 14540253,
		roughness: 0,
		metalness: 1,
		envMapIntensity: 1
	},
	metal: {
		name: "Metal",
		color: 14540253,
		roughness: .5,
		metalness: .6,
		envMapIntensity: 1
	},
	wood: {
		name: "Wood",
		color: 14540253,
		roughness: .9,
		metalness: 0,
		envMapIntensity: 1
	},
	glass: {
		name: "Glass",
		color: 14540253,
		roughness: .1,
		metalness: 0,
		envMapIntensity: 1
	}
}, ar = {
	baseScale: 100,
	bumpMapping: !0
}, or = class t {
	static dice = {};
	constructor(e) {
		this.geometries = {}, this.materials_cache = {}, this.cache_hits = 0, this.cache_misses = 0, this.label_color = "", this.dice_color = "", this.edge_color = "", this.label_outline = "", this.dice_texture = "", this.dice_material = "", this.material_options = {
			specular: 16777215,
			color: 11908533,
			shininess: 5,
			flatShading: !0
		}, Object.assign(this, ar, e);
	}
	updateConfig(e = {}) {
		Object.assign(this, e), e.scale && this.scaleGeometry();
	}
	setBumpMapping(e) {
		this.bumpMapping = e, this.materials_cache = {};
	}
	create(n) {
		let r = this.get(n);
		if (!r) return null;
		let i = this.geometries[n];
		if (i || (i = this.createGeometry(r.shape, r.scale * this.baseScale), this.geometries[n] = i), !i) return null;
		this.setMaterialInfo();
		let a = new e.Mesh(i, this.createMaterials(r, this.baseScale / 2, 1));
		switch (a.result = [], a.shape = r.shape, a.rerolls = 0, a.resultReason = "natural", a.mass = r.mass, a.getFaceValue = function() {
			let n = this.resultReason, r = new e.Vector3(0, 0, this.shape == "d4" ? -1 : 1), i, a = Math.PI * 2, o = this.geometry.getAttribute("normal").array;
			for (let t = 0, n = this.geometry.groups.length; t < n; ++t) {
				let n = this.geometry.groups[t];
				if (n.materialIndex == 0) continue;
				let s = t * 9, c = new e.Vector3(o[s], o[s + 1], o[s + 2]).clone().applyQuaternion(this.body.quaternion).angleTo(r);
				c < a && (a = c, i = n);
			}
			let s = i.materialIndex - 1, c = 2, l = t.dice[this.notation.type];
			if (this.shape == "d4") {
				let e = s - 1 == 0 ? 5 : s;
				return {
					value: s,
					label: l.labels[s - 1][e][0],
					reason: n
				};
			}
			return ["d10", "d2"].includes(this.shape) && (s += 1, --c), {
				value: l.values[(s - 1) % l.values.length],
				label: l.labels[(s - 1) % (l.labels.length - 2) + c],
				reason: n
			};
		}, a.storeRolledValue = function(e) {
			this.resultReason = e || this.resultReason, this.result.push(this.getFaceValue());
		}, a.getLastValue = function() {
			return !this.result || this.result.length < 1 ? {
				value: void 0,
				label: "",
				reason: ""
			} : this.result[this.result.length - 1];
		}, a.ignoreLastValue = function(e) {
			let t = this.getLastValue();
			t.value !== void 0 && (t.ignore = e, this.setLastValue(t));
		}, a.setLastValue = function(e) {
			if (!(!this.result || this.result.length < 1) && !(!e || e.length < 1)) return this.result[this.result.length - 1] = e;
		}, r.color && (a.material[0].color = new e.Color(r.color), a.material[0].emissive = new e.Color(r.color), a.material[0].emissiveIntensity = 1, a.material[0].needsUpdate = !0), r.values.length) {
			case 1: return this.fixmaterials(a, 1);
			case 2: return this.fixmaterials(a, 2);
			case 3: return this.fixmaterials(a, 3);
			default: return a;
		}
	}
	get(e) {
		let n;
		return t.dice.hasOwnProperty(e) ? n = t.dice[e] : (n = new rr(e), t.dice[e] = n), n;
	}
	getGeometry(e) {
		return this.geometries[e];
	}
	scaleGeometry() {}
	createMaterials(t, n, r, i = !0, a = 0) {
		let o = [], s = t.labels;
		t.shape == "d4" && (s = t.labels[a], n = this.baseScale / 2, r = this.baseScale * 2);
		for (var c = 0; c < s.length; ++c) {
			var l;
			this.dice_material == "none" ? l = new e.MeshPhongMaterial(this.material_options) : (l = new e.MeshStandardMaterial(ir[this.dice_material]), l.envMapIntensity = 0);
			let a;
			if (c == 0) {
				let e = { name: "none" };
				this.dice_texture_rand.composite != "source-over" && (e = this.dice_texture_rand), a = this.createTextMaterial(t, s, c, n, r, e, this.label_color_rand, this.label_outline_rand, this.edge_color_rand, i), l.map = a.composite;
			} else if (a = this.createTextMaterial(t, s, c, n, r, this.dice_texture_rand, this.label_color_rand, this.label_outline_rand, this.dice_color_rand, i), l.map = a.composite, this.bumpMapping) {
				{
					let e = .75;
					n > 35 && (e = 1), n > 40 && (e = 2.5), n > 45 && (e = 4), l.bumpScale = e;
				}
				a.bump && (l.bumpMap = a.bump), t.shape != "d4" && t.normals[c] && (l.bumpMap = new e.Texture(t.normals[c]), l.bumpScale = 4, l.bumpMap.needsUpdate = !0);
			}
			l.opacity = 1, l.transparent = !0, l.depthTest = !1, l.needUpdate = !0, o.push(l);
		}
		return o;
	}
	createTextMaterial(t, n, r, i, a, o, s, c, l, u) {
		if (n[r] === void 0) return null;
		o ||= this.dice_texture_rand, s ||= this.label_color_rand, c ||= this.label_outline_rand, l ||= this.dice_color_rand, u ??= !0;
		let d = n[r], f = !1, p = d;
		d instanceof HTMLImageElement ? p = d.src : d instanceof Array && d.forEach((e) => {
			p += e.src;
		});
		let m = t.type + p + r + o.name + s + c + l;
		if (t.shape == "d4" && (m = t.type + p + o.name + s + c + l), u && this.materials_cache[m] != null) return this.cache_hits++, this.materials_cache[m];
		let h = document.createElement("canvas"), g = h.getContext("2d", { alpha: !0 });
		g.globalAlpha = 0, g.clearRect(0, 0, h.width, h.height);
		let _ = document.createElement("canvas"), v = _.getContext("2d", { alpha: !0 });
		v.globalAlpha = 0, v.clearRect(0, 0, _.width, _.height);
		let y;
		if (y = t.shape == "d4" ? this.calc_texture_size(i + a) * 4 : this.calc_texture_size(i + i * 2 * a) * 4, h.width = h.height = y, _.width = _.height = y, g.fillStyle = l, g.fillRect(0, 0, h.width, h.height), v.fillStyle = "#FFFFFF", v.fillRect(0, 0, _.width, _.height), o.texture && o.name != "" && o.name != "none" ? (g.globalCompositeOperation = o.composite || "source-over", g.drawImage(o.texture, 0, 0, h.width, h.height), g.globalCompositeOperation = "source-over", o.bump && (v.globalCompositeOperation = "source-over", v.drawImage(o.bump, 0, 0, h.width, h.height))) : g.globalCompositeOperation = "source-over", g.globalCompositeOperation = "source-over", g.textAlign = "center", g.textBaseline = "middle", v.textAlign = "center", v.textBaseline = "middle", t.shape != "d4") {
			let e = {
				d8: {
					even: -7.5,
					odd: -127.5
				},
				d10: { all: -6 },
				d12: { all: 5 },
				d20: { all: -7.5 }
			}[t.shape];
			if (e) {
				let t;
				if (t = e.hasOwnProperty("all") ? e.all : r > 0 && r % 2 != 0 ? e.odd : e.even, t && t != 0) {
					var b = h.width / 2, x = h.height / 2;
					g.translate(b, x), g.rotate(Math.PI / 180 * t), g.translate(-b, -x), v.translate(b, x), v.rotate(Math.PI / 180 * t), v.translate(-b, -x);
				}
			}
			if (d instanceof HTMLImageElement) f = !0, g.drawImage(d, 0, 0, d.width, d.height, 0, 0, h.width, h.height);
			else {
				let e = y / (1 + 2 * a), n = h.height / 2 + 10, r = h.width / 2;
				t.shape == "d10" ? (e *= .75, n = n * 1.15 - 10) : t.shape == "d20" && (r *= .98), g.font = e + "pt " + t.font, v.font = e + "pt " + t.font;
				let i = g.measureText("M").width * 1.4, o = d.split("\n");
				o.length > 1 && (e /= o.length, g.font = e + "pt " + t.font, v.font = e + "pt " + t.font, i = g.measureText("M").width * 1.2, n -= i * o.length / 2);
				for (let e = 0, t = o.length; e < t; e++) {
					let t = o[e].trim();
					c != "none" && c != l && (g.strokeStyle = c, g.lineWidth = 5, g.strokeText(o[e], r, n), v.strokeStyle = "#000000", v.lineWidth = 5, v.strokeText(o[e], r, n), (t == "6" || t == "9") && (g.strokeText("  .", r, n), v.strokeText("  .", r, n))), g.fillStyle = s, g.fillText(o[e], r, n), v.fillStyle = "#000000", v.fillText(o[e], r, n), (t == "6" || t == "9") && (g.fillText("  .", r, n), v.fillText("  .", r, n)), n += i * 1.5;
				}
			}
		} else {
			var b = h.width / 2, x = h.height / 2;
			g.font = y / 128 * 24 + "pt " + t.font, v.font = y / 128 * 24 + "pt " + t.font;
			for (let e = 0; e < d.length; e++) {
				if (d[e] instanceof HTMLImageElement) {
					let t = d[e].width / h.width;
					g.drawImage(d[e], 0, 0, d[e].width, d[e].height, 100 / t, 25 / t, 60 / t, 60 / t);
				} else c != "none" && c != l && (g.strokeStyle = c, g.lineWidth = 5, g.strokeText(d[e], b, x - y * .3), v.strokeStyle = "#000000", v.lineWidth = 5, v.strokeText(d[e], b, x - y * .3)), g.fillStyle = s, g.fillText(d[e], b, x - y * .3), v.fillStyle = "#000000", v.fillText(d[e], b, x - y * .3);
				g.translate(b, x), g.rotate(Math.PI * 2 / 3), g.translate(-b, -x), v.translate(b, x), v.rotate(Math.PI * 2 / 3), v.translate(-b, -x);
			}
		}
		var S = new e.CanvasTexture(h);
		S.colorSpace = e.SRGBColorSpace;
		var C = f ? null : new e.CanvasTexture(_);
		return u && (this.cache_misses++, this.materials_cache[m] = {
			composite: S,
			bump: C
		}), {
			composite: S,
			bump: C
		};
	}
	applyColorSet(e) {
		this.colordata = e, this.label_color = e.foreground, this.dice_color = e.background, this.label_outline = e.outline, this.dice_texture = e.texture, this.dice_material = e?.texture?.material || "none", this.edge_color = e.hasOwnProperty("edge") ? e.edge : e.background;
	}
	setMaterialInfo(e = "") {
		let t = this.colordata, n = this.dice_texture, r = this.dice_material;
		if (this.dice_color_rand = "", this.label_color_rand = "", this.label_outline_rand = "", this.dice_texture_rand = "", this.dice_material_rand = "", this.edge_color_rand = "", Array.isArray(this.dice_color)) {
			var i = Math.floor(Math.random() * this.dice_color.length);
			Array.isArray(this.label_color) && this.label_color.length == this.dice_color.length && (this.label_color_rand = this.label_color[i], Array.isArray(this.label_outline) && this.label_outline.length == this.label_color.length && (this.label_outline_rand = this.label_outline[i])), Array.isArray(this.dice_texture) && this.dice_texture.length == this.dice_color.length && (this.dice_texture_rand = this.dice_texture[i], this.dice_material_rand = this.dice_texture_rand.material), Array.isArray(this.edge_color) && this.edge_color.length == this.dice_color.length && (this.edge_color_rand = this.edge_color[i]), this.dice_color_rand = this.dice_color[i];
		} else this.dice_color_rand = this.dice_color;
		if (this.edge_color_rand == "") if (Array.isArray(this.edge_color)) {
			var i = Math.floor(Math.random() * this.edge_color.length);
			this.edge_color_rand = this.edge_color[i];
		} else this.edge_color_rand = this.edge_color;
		if (this.label_color_rand == "" && Array.isArray(this.label_color)) {
			var i = this.label_color[Math.floor(Math.random() * this.label_color.length)];
			Array.isArray(this.label_outline) && this.label_outline.length == this.label_color.length && (this.label_outline_rand = this.label_outline[i]), this.label_color_rand = this.label_color[i];
		} else this.label_color_rand == "" && (this.label_color_rand = this.label_color);
		if (this.label_outline_rand == "" && Array.isArray(this.label_outline)) {
			var i = this.label_outline[Math.floor(Math.random() * this.label_outline.length)];
			this.label_outline_rand = this.label_outline[i];
		} else this.label_outline_rand == "" && (this.label_outline_rand = this.label_outline);
		this.dice_texture_rand == "" && Array.isArray(this.dice_texture) ? (this.dice_texture_rand = this.dice_texture[Math.floor(Math.random() * this.dice_texture.length)], this.dice_material_rand = this.dice_texture_rand.material || this.dice_material) : this.dice_texture_rand == "" && (this.dice_texture_rand = this.dice_texture, this.dice_material_rand = this.dice_texture_rand.material || this.dice_material), this.dice_material_rand == "" && Array.isArray(this.dice_material) ? this.dice_material_rand = this.dice_material[Math.floor(Math.random() * this.dice_material.length)] : this.dice_material_rand == "" && (this.dice_material_rand = this.dice_material), this.colordata && this.colordata.id != t.id && this.applyColorSet(t, n, r);
	}
	calc_texture_size(e) {
		return 2 ** Math.floor(Math.log(e) / Math.log(2));
	}
	createGeometry(t, n, r = !1) {
		let i = r ? "create_shape" : "create_geom";
		switch (t) {
			case "d2":
				var a = new e.CylinderGeometry(1 * n, 1 * n, .1 * n, 32);
				return a.cannon_shape = new yt(1 * n, 1 * n, .1 * n, 8), a;
			case "d4": return this[i]($.d4.vertices, $.d4.faces, n, -.1, Math.PI * 7 / 6, .96);
			case "d6": return this[i]($.d6.vertices, $.d6.faces, n, .1, Math.PI / 4, .96);
			case "d8": return this[i]($.d8.vertices, $.d8.faces, n, 0, -Math.PI / 4 / 2, .965);
			case "d10": return this[i]($.d10.vertices, $.d10.faces, n, .3, Math.PI, .945);
			case "d12": return this[i]($.d12.vertices, $.d12.faces, n, .2, -Math.PI / 4 / 2, .968);
			case "d20": return this[i]($.d20.vertices, $.d20.faces, n, -.2, -Math.PI / 4 / 2, .955);
			default: return console.error(`Geometry for ${t} is not available`), null;
		}
	}
	fixmaterials(e, t) {
		for (let r = 0, i = e.geometry.groups.length; r < i; ++r) {
			var n = e.geometry.groups[r].materialIndex - 2;
			if (n < t) continue;
			let i = n % t;
			e.geometry.groups[r].materialIndex = i + 2;
		}
		return e.geometry.elementsNeedUpdate = !0, e;
	}
	create_shape(t, n, i) {
		for (var a = Array(t.length), o = 0; o < t.length; ++o) a[o] = new e.Vector3().fromArray(t[o]).normalize();
		for (var s = Array(t.length), c = Array(n.length), o = 0; o < a.length; ++o) {
			var l = a[o];
			s[o] = new r(l.x * i, l.y * i, l.z * i);
		}
		for (var o = 0; o < n.length; ++o) c[o] = n[o].slice(0, n[o].length - 1);
		return new y({
			vertices: s,
			faces: c
		});
	}
	make_geom(t, n, r, i, a) {
		let o = new e.BufferGeometry();
		for (let e = 0; e < t.length; ++e) t[e] = t[e].multiplyScalar(r);
		let s = [], c = [], l = [], u = new e.Vector3(), d = new e.Vector3(), f, p = 0;
		for (let e = 0; e < n.length; ++e) {
			let r = n[e], m = r.length - 1, h = Math.PI * 2 / m;
			f = r[m] + 1;
			for (let e = 0; e < m - 2; ++e) s.push(...t[r[0]].toArray()), s.push(...t[r[e + 1]].toArray()), s.push(...t[r[e + 2]].toArray()), u.subVectors(t[r[e + 2]], t[r[e + 1]]), d.subVectors(t[r[0]], t[r[e + 1]]), u.cross(d), u.normalize(), c.push(...u.toArray()), c.push(...u.toArray()), c.push(...u.toArray()), l.push((Math.cos(a) + 1 + i) / 2 / (1 + i), (Math.sin(a) + 1 + i) / 2 / (1 + i)), l.push((Math.cos(h * (e + 1) + a) + 1 + i) / 2 / (1 + i), (Math.sin(h * (e + 1) + a) + 1 + i) / 2 / (1 + i)), l.push((Math.cos(h * (e + 2) + a) + 1 + i) / 2 / (1 + i), (Math.sin(h * (e + 2) + a) + 1 + i) / 2 / (1 + i));
			let g = (m - 2) * 3;
			for (let e = 0; e < g / 3; e++) o.addGroup(p, 3, f), p += 3;
		}
		return o.setAttribute("position", new e.Float32BufferAttribute(s, 3)), o.setAttribute("normal", new e.Float32BufferAttribute(c, 3)), o.setAttribute("uv", new e.Float32BufferAttribute(l, 2)), o.boundingSphere = new e.Sphere(new e.Vector3(), r), o;
	}
	make_d10_geom(t, n, r, i, a) {
		let o = new e.BufferGeometry();
		for (let e = 0; e < t.length; ++e) t[e] = t[e].multiplyScalar(r);
		let s = [], c = [], l = [], u = new e.Vector3(), d = new e.Vector3(), f, p = 0;
		for (let e = 0; e < n.length; ++e) {
			let r = n[e], y = r.length - 1, b = Math.PI * 2 / y;
			f = r[y] + 1;
			var m = .65, h = .85, g = 1 - 1 * h, _ = 1 - .895 / 1.105 * h, v = 1;
			for (let o = 0; o < y - 2; ++o) s.push(...t[r[0]].toArray()), s.push(...t[r[o + 1]].toArray()), s.push(...t[r[o + 2]].toArray()), u.subVectors(t[r[o + 2]], t[r[o + 1]]), d.subVectors(t[r[0]], t[r[o + 1]]), u.cross(d), u.normalize(), c.push(...u.toArray()), c.push(...u.toArray()), c.push(...u.toArray()), n[e][n[e].length - 1] == -1 || o >= 2 ? (l.push((Math.cos(a) + 1 + i) / 2 / (1 + i), (Math.sin(a) + 1 + i) / 2 / (1 + i)), l.push((Math.cos(b * (o + 1) + a) + 1 + i) / 2 / (1 + i), (Math.sin(b * (o + 1) + a) + 1 + i) / 2 / (1 + i)), l.push((Math.cos(b * (o + 2) + a) + 1 + i) / 2 / (1 + i), (Math.sin(b * (o + 2) + a) + 1 + i) / 2 / (1 + i))) : o == 0 ? (l.push(.5 - m / 2, _), l.push(.5, g), l.push(.5 + m / 2, _)) : o == 1 && (l.push(.5 - m / 2, _), l.push(.5 + m / 2, _), l.push(.5, v));
			let x = (y - 2) * 3;
			for (let e = 0; e < x / 3; e++) o.addGroup(p, 3, f), p += 3;
		}
		return o.setAttribute("position", new e.Float32BufferAttribute(s, 3)), o.setAttribute("normal", new e.Float32BufferAttribute(c, 3)), o.setAttribute("uv", new e.Float32BufferAttribute(l, 2)), o.boundingSphere = new e.Sphere(new e.Vector3(), r), o;
	}
	chamfer_geom(t, n, r) {
		for (var i = [], a = [], o = Array(t.length), s = 0; s < t.length; ++s) o[s] = [];
		for (var s = 0; s < n.length; ++s) {
			for (var c = n[s], l = c.length - 1, u = new e.Vector3(), d = Array(l), f = 0; f < l; ++f) {
				var p = t[c[f]].clone();
				u.add(p), o[c[f]].push(d[f] = i.push(p) - 1);
			}
			u.divideScalar(l);
			for (var f = 0; f < l; ++f) {
				var p = i[d[f]];
				p.subVectors(p, u).multiplyScalar(r).addVectors(p, u);
			}
			d.push(c[l]), a.push(d);
		}
		for (var s = 0; s < n.length - 1; ++s) for (var f = s + 1; f < n.length; ++f) {
			for (var m = [], h = -1, g = 0; g < n[s].length - 1; ++g) {
				var _ = n[f].indexOf(n[s][g]);
				_ >= 0 && _ < n[f].length - 1 && (h >= 0 && g != h + 1 ? m.unshift([s, g], [f, _]) : m.push([s, g], [f, _]), h = g);
			}
			m.length == 4 && a.push([
				a[m[0][0]][m[0][1]],
				a[m[1][0]][m[1][1]],
				a[m[3][0]][m[3][1]],
				a[m[2][0]][m[2][1]],
				-1
			]);
		}
		for (var s = 0; s < o.length; ++s) {
			for (var v = o[s], d = [v[0]], y = v.length - 1; y;) {
				for (var g = n.length; g < a.length; ++g) {
					var b = a[g].indexOf(d[d.length - 1]);
					if (b >= 0 && b < 4) {
						--b == -1 && (b = 3);
						var x = a[g][b];
						if (v.indexOf(x) >= 0) {
							d.push(x);
							break;
						}
					}
				}
				--y;
			}
			d.push(-1), a.push(d);
		}
		return {
			vectors: i,
			faces: a
		};
	}
	create_geom(t, n, r, i, a, o) {
		for (var s = Array(t.length), c = 0; c < t.length; ++c) s[c] = new e.Vector3().fromArray(t[c]).normalize();
		var l = this.chamfer_geom(s, n, o);
		if (n.length != 10) var u = this.make_geom(l.vectors, l.faces, r, i, a);
		else var u = this.make_d10_geom(l.vectors, l.faces, r, i, a);
		return u.cannon_shape = this.create_shape(t, n, r), u.name = "d" + n.length, u;
	}
}, sr = {
	cloudy: {
		name: "Clouds (Transparent)",
		composite: "destination-in",
		source: "textures/cloudy.webp",
		source_bump: "textures/cloudy.alt.webp"
	},
	cloudy_2: {
		name: "Clouds",
		composite: "multiply",
		source: "textures/cloudy.alt.webp",
		source_bump: "textures/cloudy.alt.webp"
	},
	fire: {
		name: "Fire",
		composite: "multiply",
		source: "textures/fire.webp",
		source_bump: "textures/fire.webp",
		material: "metal"
	},
	marble: {
		name: "Marble",
		composite: "multiply",
		source: "textures/marble.webp",
		source_bump: "",
		material: "glass"
	},
	water: {
		name: "Water",
		composite: "destination-in",
		source: "textures/water.webp",
		source_bump: "textures/water.webp",
		material: "glass"
	},
	ice: {
		name: "Ice",
		composite: "destination-in",
		source: "textures/ice.webp",
		source_bump: "textures/ice.webp",
		material: "glass"
	},
	paper: {
		name: "Paper",
		composite: "multiply",
		source: "textures/paper.webp",
		source_bump: "textures/paper-bump.webp",
		material: "wood"
	},
	speckles: {
		name: "Speckles",
		composite: "multiply",
		source: "textures/speckles.webp",
		source_bump: "textures/speckles.webp",
		material: "none"
	},
	glitter: {
		name: "Glitter",
		composite: "multiply",
		source: "textures/glitter.webp",
		source_bump: "textures/glitter-bump.webp",
		material: "none"
	},
	glitter_2: {
		name: "Glitter (Transparent)",
		composite: "destination-in",
		source: "textures/glitter-alpha.webp",
		source_bump: "",
		material: "none"
	},
	stars: {
		name: "Stars",
		composite: "multiply",
		source: "textures/stars.webp",
		source_bump: "textures/stars.webp",
		material: "none"
	},
	stainedglass: {
		name: "Stained Glass",
		composite: "multiply",
		source: "textures/stainedglass.webp",
		source_bump: "textures/stainedglass-bump.webp",
		material: "glass"
	},
	wood: {
		name: "Wood",
		composite: "multiply",
		source: "textures/wood.webp",
		source_bump: "textures/wood.webp",
		material: "wood"
	},
	metal: {
		name: "Stainless Steel",
		composite: "multiply",
		source: "textures/metal.webp",
		source_bump: "textures/metal-bump.webp",
		material: "metal"
	},
	skulls: {
		name: "Skulls",
		composite: "multiply",
		source: "textures/skulls.webp",
		source_bump: "textures/skulls.webp"
	},
	leopard: {
		name: "Leopard",
		composite: "multiply",
		source: "textures/leopard.webp",
		source_bump: "textures/leopard.webp",
		material: "wood"
	},
	tiger: {
		name: "Tiger",
		composite: "multiply",
		source: "textures/tiger.webp",
		source_bump: "textures/tiger.webp",
		material: "wood"
	},
	cheetah: {
		name: "Cheetah",
		composite: "multiply",
		source: "textures/cheetah.webp",
		source_bump: "textures/cheetah.webp",
		material: "wood"
	},
	dragon: {
		name: "Dragon",
		composite: "multiply",
		source: "textures/dragon.webp",
		source_bump: "textures/dragon-bump.webp",
		material: "none"
	},
	lizard: {
		name: "Lizard",
		composite: "multiply",
		source: "textures/lizard.webp",
		source_bump: "textures/lizard.webp",
		material: "none"
	},
	bird: {
		name: "Bird",
		composite: "multiply",
		source: "textures/feather.webp",
		source_bump: "textures/feather-bump.webp",
		material: "wood"
	},
	astral: {
		name: "Astral Sea",
		composite: "multiply",
		source: "textures/astral.webp",
		source_bump: "textures/stars.webp",
		material: "none"
	},
	acleaf: {
		name: "AC Leaf",
		composite: "multiply",
		source: "textures/acleaf.webp",
		source_bump: "textures/acleaf.webp",
		material: "none"
	},
	thecage: {
		name: "Nicholas Cage",
		composite: "multiply",
		source: "textures/thecage.webp",
		source_bump: "",
		material: "metal"
	},
	isabelle: {
		name: "Isabelle",
		composite: "source-over",
		source: "textures/isabelle.webp",
		source_bump: "",
		material: "none"
	},
	bronze01: {
		name: "bronze01",
		composite: "difference",
		source: "textures/bronze01.webp",
		source_bump: "",
		material: "metal"
	},
	bronze02: {
		name: "bronze02",
		composite: "difference",
		source: "textures/bronze02.webp",
		source_bump: "",
		material: "metal"
	},
	bronze03: {
		name: "bronze03",
		composite: "difference",
		source: "textures/bronze03.webp",
		source_bump: "",
		material: "metal"
	},
	bronze03a: {
		name: "bronze03a",
		composite: "difference",
		source: "textures/bronze03a.webp",
		source_bump: "",
		material: "metal"
	},
	bronze03b: {
		name: "bronze03b",
		composite: "difference",
		source: "textures/bronze03b.webp",
		source_bump: "",
		material: "metal"
	},
	bronze04: {
		name: "bronze04",
		composite: "difference",
		source: "textures/bronze04.webp",
		source_bump: "",
		material: "metal"
	},
	none: {
		name: "none",
		composite: "source-over",
		source: "",
		source_bump: "",
		material: ""
	},
	"": {
		name: "~ Preset ~",
		composite: "source-over",
		source: "",
		source_bump: "",
		material: ""
	}
}, cr = {
	coin_default: {
		name: "Gold Coin",
		description: "Gold Dragonhead Coin",
		category: "Other",
		foreground: "#f6c928",
		background: "#f6c928",
		outline: "none",
		texture: "metal"
	},
	coin_silver: {
		name: "Silver Coin",
		description: "Gold Dragonhead Coin",
		category: "Other",
		foreground: "#f6c928",
		background: "#f6c928",
		outline: "none",
		texture: "metal"
	},
	radiant: {
		name: "Radiant",
		category: "Damage Types",
		foreground: "#F9B333",
		background: "#FFFFFF",
		outline: "",
		texture: "paper",
		description: "Radiant"
	},
	fire: {
		name: "Fire",
		category: "Damage Types",
		foreground: "#f8d84f",
		background: [
			"#f8d84f",
			"#f9b02d",
			"#f43c04",
			"#910200",
			"#4c1009"
		],
		outline: "black",
		texture: "fire",
		description: "Fire"
	},
	ice: {
		name: "Ice",
		category: "Damage Types",
		foreground: "#60E9FF",
		background: [
			"#214fa3",
			"#3c6ac1",
			"#253f70",
			"#0b56e2",
			"#09317a"
		],
		outline: "black",
		texture: "ice",
		description: "Ice"
	},
	poison: {
		name: "Poison",
		category: "Damage Types",
		foreground: "#D6A8FF",
		background: [
			"#313866",
			"#504099",
			"#66409e",
			"#934fc3",
			"#c949fc"
		],
		outline: "black",
		texture: "cloudy",
		description: "Poison"
	},
	acid: {
		name: "Acid",
		category: "Damage Types",
		foreground: "#A9FF70",
		background: [
			"#a6ff00",
			"#83b625",
			"#5ace04",
			"#69f006",
			"#b0f006",
			"#93bc25"
		],
		outline: "black",
		texture: "marble",
		description: "Acid"
	},
	thunder: {
		name: "Thunder",
		category: "Damage Types",
		foreground: "#FFC500",
		background: "#7D7D7D",
		outline: "black",
		texture: "cloudy",
		description: "Thunder"
	},
	lightning: {
		name: "Lightning",
		category: "Damage Types",
		foreground: "#FFC500",
		background: [
			"#f17105",
			"#f3ca40",
			"#eddea4",
			"#df9a57",
			"#dea54b"
		],
		outline: "#7D7D7D",
		texture: "ice",
		description: "Lightning"
	},
	air: {
		name: "Air",
		category: "Damage Types",
		foreground: "#ffffff",
		background: [
			"#d0e5ea",
			"#c3dee5",
			"#a4ccd6",
			"#8dafb7",
			"#80a4ad"
		],
		outline: "black",
		texture: "cloudy",
		description: "Air"
	},
	water: {
		name: "Water",
		category: "Damage Types",
		foreground: "#60E9FF",
		background: [
			"#87b8c4",
			"#77a6b2",
			"#6b98a3",
			"#5b8691",
			"#4b757f"
		],
		outline: "black",
		texture: "water",
		description: "Water"
	},
	earth: {
		name: "Earth",
		category: "Damage Types",
		foreground: "#6C9943",
		background: [
			"#346804",
			"#184200",
			"#527f22",
			"#3a1d04",
			"#56341a",
			"#331c17",
			"#5a352a",
			"#302210"
		],
		outline: "black",
		texture: "speckles",
		description: "Earth"
	},
	force: {
		name: "Force",
		category: "Damage Types",
		foreground: "white",
		background: [
			"#FF97FF",
			"#FF68FF",
			"#C651C6"
		],
		outline: "#570000",
		texture: "stars",
		description: "Force"
	},
	psychic: {
		name: "Psychic",
		category: "Damage Types",
		foreground: "#D6A8FF",
		background: [
			"#313866",
			"#504099",
			"#66409E",
			"#934FC3",
			"#C949FC",
			"#313866"
		],
		outline: "black",
		texture: "speckles",
		description: "Psychic"
	},
	necrotic: {
		name: "Necrotic",
		category: "Damage Types",
		foreground: "#ffffff",
		background: "#6F0000",
		outline: "black",
		texture: "skulls",
		description: "Necrotic"
	},
	breebaby: {
		name: "Pastel Sunset",
		category: "Custom Sets",
		foreground: [
			"#5E175E",
			"#564A5E",
			"#45455E",
			"#3D5A5E",
			"#1E595E",
			"#5E3F3D",
			"#5E1E29",
			"#283C5E",
			"#25295E"
		],
		background: [
			"#FE89CF",
			"#DFD4F2",
			"#C2C2E8",
			"#CCE7FA",
			"#A1D9FC",
			"#F3C3C2",
			"#EB8993",
			"#8EA1D2",
			"#7477AD"
		],
		outline: "white",
		texture: "marble",
		description: "Pastel Sunset, for Breyanna"
	},
	pinkdreams: {
		name: "Pink Dreams",
		category: "Custom Sets",
		foreground: "white",
		background: [
			"#ff007c",
			"#df73ff",
			"#f400a1",
			"#df00ff",
			"#ff33cc"
		],
		outline: "#570000",
		texture: "skulls",
		description: "Pink Dreams, for Ethan"
	},
	inspired: {
		name: "Inspired",
		category: "Custom Sets",
		foreground: "#FFD800",
		background: "#C4C4B6",
		outline: "#8E8E86",
		texture: "none",
		description: "Inspired, for Austin"
	},
	bloodmoon: {
		name: "Blood Moon",
		category: "Custom Sets",
		foreground: "#CDB800",
		background: "#6F0000",
		outline: "black",
		texture: "marble",
		description: "Blood Moon, for Jared"
	},
	starynight: {
		name: "Stary Night",
		category: "Custom Sets",
		foreground: "#4F708F",
		background: [
			"#091636",
			"#233660",
			"#4F708F",
			"#8597AD",
			"#E2E2E2"
		],
		outline: "white",
		texture: "speckles",
		description: "Stary Night, for Mai"
	},
	glitterparty: {
		name: "Glitter Party",
		category: "Custom Sets",
		foreground: "white",
		background: [
			"#FFB5F5",
			"#7FC9FF",
			"#A17FFF"
		],
		outline: "none",
		texture: "glitter",
		description: "Glitter Party, for Austin"
	},
	astralsea: {
		name: "Astral Sea",
		category: "Custom Sets",
		foreground: "#565656",
		background: "white",
		outline: "none",
		texture: "astral",
		description: "The Astral Sea, for Austin"
	},
	bronze: {
		name: "Thylean Bronze",
		description: "Thylean Bronze by @SpencerThayer",
		category: "Custom Sets",
		foreground: [
			"#FF9159",
			"#FFB066",
			"#FFBF59",
			"#FFD059"
		],
		background: [
			"#705206",
			"#7A4E06",
			"#643100",
			"#7A2D06"
		],
		outline: [
			"#3D2D03",
			"#472D04",
			"#301700",
			"#471A04"
		],
		edge: [
			"#FF5D0D",
			"#FF7B00",
			"#FFA20D",
			"#FFBA0D"
		],
		texture: [
			"bronze01",
			"bronze02",
			"bronze03",
			"bronze03a",
			"bronze03b",
			"bronze04"
		]
	},
	dragons: {
		name: "Here be Dragons",
		category: "Custom Sets",
		foreground: "#FFFFFF",
		background: [
			"#B80000",
			"#4D5A5A",
			"#5BB8FF",
			"#7E934E",
			"#FFFFFF",
			"#F6ED7C",
			"#7797A3",
			"#A78437",
			"#862C1A",
			"#FFDF8A"
		],
		outline: "black",
		texture: ["dragon", "lizard"],
		description: "Here be Dragons"
	},
	birdup: {
		name: "Bird Up",
		category: "Custom Sets",
		foreground: "#FFFFFF",
		background: [
			"#F11602",
			"#FFC000",
			"#6EC832",
			"#0094BC",
			"#05608D",
			"#FEABB3",
			"#F75680",
			"#F3F0DF",
			"#C7A57F"
		],
		outline: "black",
		texture: "bird",
		description: "Bird Up!"
	},
	tigerking: {
		name: "Tiger King",
		category: "Other",
		foreground: "#ffffff",
		background: "#FFCC40",
		outline: "black",
		texture: [
			"leopard",
			"tiger",
			"cheetah"
		],
		description: "Leopard Print"
	},
	covid: {
		name: "COViD",
		category: "Other",
		foreground: "#A9FF70",
		background: [
			"#a6ff00",
			"#83b625",
			"#5ace04",
			"#69f006",
			"#b0f006",
			"#93bc25"
		],
		outline: "black",
		texture: "fire",
		description: "Covid-19"
	},
	acleaf: {
		name: "Animal Crossing",
		category: "Other",
		foreground: "#00FF00",
		background: "#07540A",
		outline: "black",
		texture: "acleaf",
		description: "Animal Crossing Leaf"
	},
	isabelle: {
		name: "Isabelle",
		category: "Other",
		foreground: "white",
		background: "#FEE5CC",
		outline: "black",
		texture: "isabelle",
		description: "Isabelle"
	},
	thecage: {
		name: "Nicholas Cage",
		category: "Other",
		foreground: "#ffffff",
		background: "#ffffff",
		outline: "black",
		texture: "thecage",
		description: "Nicholas Cage"
	},
	test: {
		name: "Test",
		category: "Colors",
		foreground: [
			"#00FF00",
			"#0000FF",
			"#FF0000"
		],
		background: [
			"#FF0000",
			"#00FF00",
			"#0000FF"
		],
		outline: "black",
		texture: "none",
		description: "Test"
	},
	rainbow: {
		name: "Rainblow",
		category: "Colors",
		foreground: [
			"#FF5959",
			"#FFA74F",
			"#FFFF56",
			"#59FF59",
			"#2374FF",
			"#00FFFF",
			"#FF59FF"
		],
		background: [
			"#900000",
			"#CE3900",
			"#BCBC00",
			"#00B500",
			"#00008E",
			"#008282",
			"#A500A5"
		],
		outline: "black",
		texture: "none",
		description: "Rainblow"
	},
	black: {
		name: "Black",
		category: "Colors",
		foreground: "#ffffff",
		background: "#000000",
		outline: "black",
		texture: "none",
		description: "Black"
	},
	white: {
		name: "White",
		category: "Colors",
		foreground: "#000000",
		background: "#FFFFFF",
		outline: "#FFFFFF",
		texture: "none",
		description: "White"
	},
	swrpg_abi: {
		name: "Star Wars RPG - Ability",
		category: "Star Wars™ RPG",
		foreground: "#00FF00",
		background: [
			"#3D9238",
			"#52B848",
			"#5EAC56",
			"#9ECB9A"
		],
		outline: "#000000",
		texture: "cloudy_2",
		description: "Star Wars™ RPG Ability Dice"
	},
	swrpg_pro: {
		name: "Star Wars RPG - Proficiency",
		category: "Star Wars™ RPG",
		foreground: "#FFFF00",
		background: [
			"#CABB1C",
			"#F9E33B",
			"#FFE900",
			"#F0E49D"
		],
		outline: "#000000",
		texture: "paper",
		description: "Star Wars™ RPG Proficiency Dice"
	},
	swrpg_dif: {
		name: "Star Wars RPG - Difficulty",
		category: "Star Wars™ RPG",
		foreground: "#8000FC",
		background: [
			"#39165F",
			"#664B84",
			"#50247E",
			"#745F88"
		],
		outline: "#000000",
		texture: "cloudy_2",
		description: "Star Wars™ RPG Difficulty Dice"
	},
	swrpg_cha: {
		name: "Star Wars RPG - Challenge",
		category: "Star Wars™ RPG",
		foreground: "#FF0000",
		background: [
			"#A91F32",
			"#EB4254",
			"#E51836",
			"#BA3645"
		],
		outline: "#000000",
		texture: "paper",
		description: "Star Wars™ RPG Challenge Dice"
	},
	swrpg_boo: {
		name: "Star Wars RPG - Boost",
		category: "Star Wars™ RPG",
		foreground: "#00FFFF",
		background: [
			"#4B9DC6",
			"#689FC4",
			"#85CFF2",
			"#8FC0D8"
		],
		outline: "#000000",
		texture: "glitter",
		description: "Star Wars™ RPG Boost Dice"
	},
	swrpg_set: {
		name: "Star Wars RPG - Setback",
		category: "Star Wars™ RPG",
		foreground: "#111111",
		background: [
			"#252223",
			"#241F21",
			"#282828",
			"#111111"
		],
		outline: "#ffffff",
		texture: "glitter",
		description: "Star Wars™ RPG Setback Dice"
	},
	swrpg_for: {
		name: "Star Wars RPG - Force",
		category: "Star Wars™ RPG",
		foreground: "#000000",
		background: [
			"#F3F3F3",
			"#D3D3D3",
			"#BABABA",
			"#FFFFFF"
		],
		outline: "#FFFFFF",
		texture: "stars",
		description: "Star Wars™ RPG Force Dice"
	},
	swa_red: {
		name: "Armada Attack - Red",
		category: "Star Wars™ Armada",
		foreground: "#ffffff",
		background: [
			"#440D19",
			"#8A1425",
			"#C72336",
			"#C04551"
		],
		outline: "none",
		texture: "stainedglass",
		description: "Star Wars™ Armada Red Attack Dice"
	},
	swa_blue: {
		name: "Armada Attack - Blue",
		category: "Star Wars™ Armada",
		foreground: "#ffffff",
		background: [
			"#212642",
			"#28286E",
			"#2B348C",
			"#3D4BB5",
			"#5D64AB"
		],
		outline: "none",
		texture: "stainedglass",
		description: "Star Wars™ Armada Blue Attack Dice"
	},
	swa_black: {
		name: "Armada Attack - Black",
		category: "Star Wars™ Armada",
		foreground: "#ffffff",
		background: [
			"#252223",
			"#241F21",
			"#282828",
			"#111111"
		],
		outline: "none",
		texture: "stainedglass",
		description: "Star Wars™ Armada Black Attack Dice"
	},
	xwing_red: {
		name: "X-Wing Attack - Red",
		category: "Star Wars™ X-Wing",
		foreground: "#ffffff",
		background: [
			"#440D19",
			"#8A1425",
			"#C72336",
			"#C04551"
		],
		outline: "none",
		texture: "stars",
		description: "Star Wars™ X-Wing Red Attack Dice"
	},
	xwing_green: {
		name: "X-Wing Attack - Green",
		category: "Star Wars™ X-Wing",
		foreground: "#ffffff",
		background: [
			"#3D9238",
			"#52B848",
			"#5EAC56",
			"#9ECB9A"
		],
		outline: "none",
		texture: "stars",
		description: "Star Wars™ X-Wing Green Attack Dice"
	},
	swl_atkred: {
		name: "Legion Attack - Red",
		category: "Star Wars™ Legion",
		foreground: "#ffffff",
		background: [
			"#440D19",
			"#8A1425",
			"#C72336",
			"#C04551"
		],
		outline: "none",
		texture: "fire",
		description: "Star Wars™ Legion Red Attack Dice"
	},
	swl_atkblack: {
		name: "Legion Attack - Black",
		category: "Star Wars™ Legion",
		foreground: "#ffffff",
		background: [
			"#252223",
			"#241F21",
			"#282828",
			"#111111"
		],
		outline: "none",
		texture: "fire",
		description: "Star Wars™ Legion Black Attack Dice"
	},
	swl_atkwhite: {
		name: "Legion Attack - White",
		category: "Star Wars™ Legion",
		foreground: "#000000",
		background: [
			"#ffffff",
			"#DFF4FA",
			"#BCBCBC",
			"#F1EDE2",
			"#F2ECE0"
		],
		outline: "none",
		texture: "fire",
		description: "Star Wars™ Legion White Attack Dice"
	},
	swl_defred: {
		name: "Legion Defense - Red",
		category: "Star Wars™ Legion",
		foreground: "#ffffff",
		background: [
			"#440D19",
			"#8A1425",
			"#C72336",
			"#C04551"
		],
		outline: "none",
		texture: "fire",
		description: "Star Wars™ Legion Red Defense Dice"
	},
	swl_defwhite: {
		name: "Legion Defense - White",
		category: "Star Wars™ Legion",
		foreground: "#000000",
		background: [
			"#ffffff",
			"#DFF4FA",
			"#BCBCBC",
			"#F1EDE2",
			"#F2ECE0"
		],
		outline: "none",
		texture: "fire",
		description: "Star Wars™ Legion White Defense Dice"
	}
}, lr = class {
	constructor(e = {}) {
		this.colorsets = [], this.assetPath = e.assetPath;
	}
	async ImageLoader(e) {
		if (Array.isArray(e)) {
			for (let t = 0, n = e.length; t < n; t++) e[t] = await this.ImageLoader(e[t]);
			return e;
		}
		return e.source && e.source != "" && (e.texture = await this.loadImage(e.source)), e.source_bump && e.source_bump != "" && (e.bump = await this.loadImage(e.source_bump)), e;
	}
	loadImage(e) {
		return new Promise((t, n) => {
			let r = new Image();
			r.onload = () => t(r), r.crossOrigin = "anonymous", r.src = this.assetPath + e, r.onerror = (e) => n(e);
		}).catch((e) => {
			console.error("Unable to load image texture");
		});
	}
	async getColorSet(e) {
		let t, n;
		if (typeof e == "string" && (t = e), typeof e == "object" && (t = e.colorset), this.colorsets.hasOwnProperty(t)) return this.colorsets[t];
		let r = cr[t];
		return n = e.texture || r.texture, r.texture = this.getTexture(n), r.texture = await this.ImageLoader(r.texture), e.material && (r.texture.material = e.material), this.colorsets[t] = r, r;
	}
	async makeColorSet(e = {}) {
		if (this.colorsets.hasOwnProperty(e.name)) return this.colorsets[e.name];
		let t = cr.white, n = Object.assign({}, t, e), r = this.getTexture(n.texture);
		return n.texture = await this.ImageLoader(r), e.material && (n.texture.material = e.material), n.name.toLowerCase() === "white" && (n.name = `${Date.now()}`), this.colorsets[n.name] = n, n;
	}
	getTexture(e) {
		if (Array.isArray(e)) {
			let t = [];
			for (let n = 0, r = e.length; n < r; n++) t.push(this.getTexture(e[n]));
			return t;
		}
		return sr.hasOwnProperty(e) ? sr[e] : sr.none;
	}
}, ur = {
	default: {
		name: "Solid Color",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "wood_tray",
		colors: {
			fg: "#9794ff",
			bg: "#0b1a3e"
		},
		cubeMap: [
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg"
		]
	},
	"blue-felt": {
		name: "Blue Felt",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "felt",
		colors: {
			fg: "#9794ff",
			bg: "#0b1a3e"
		},
		cubeMap: [
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg"
		]
	},
	"red-felt": {
		name: "Red Felt",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "felt",
		colors: {
			fg: "#ff9494",
			bg: "#4d1e1e"
		},
		cubeMap: [
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg"
		]
	},
	"green-felt": {
		name: "Green Felt",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "felt",
		colors: {
			fg: "#97ff94",
			bg: "#244d1e"
		},
		cubeMap: [
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg",
			"envmap.jpg"
		]
	},
	taverntable: {
		name: "Old Tavern Table",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "wood_table",
		colors: {
			fg: "#9794ff",
			bg: "#0b1a3e"
		},
		cubeMap: [
			"px.png",
			"nx.png",
			"py.png",
			"ny.png",
			"pz.png",
			"nz.png"
		]
	},
	mahogany: {
		name: "(Mah-Hog-Any)",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "wood_table",
		colors: {
			fg: "#9794ff",
			bg: "#0b1a3e"
		},
		cubeMap: [
			"px.png",
			"nx.png",
			"py.png",
			"ny.png",
			"pz.png",
			"nz.png"
		]
	},
	stainless: {
		name: "Stainless Steel",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "metal",
		colors: {
			fg: "#9794ff",
			bg: "#0b1a3e"
		},
		cubeMap: [
			"px.png",
			"nx.png",
			"py.png",
			"ny.png",
			"pz.png",
			"nz.png"
		]
	},
	cyberpunk: {
		name: "Neo-New-Future-City",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "metal",
		colors: {
			fg: "#3494A6",
			bg: "#440B28"
		},
		cubeMap: [
			"px.png",
			"nx.png",
			"py.png",
			"ny.png",
			"pz.png",
			"nz.png"
		]
	},
	cagetown: {
		name: "Cage Town",
		author: "MajorVictory",
		showColorPicker: !0,
		surface: "wood_table",
		colors: {
			fg: "#D7A866",
			bg: "#282811"
		},
		cubeMap: [
			"px.png",
			"nx.png",
			"py.png",
			"ny.png",
			"pz.png",
			"nz.png"
		]
	}
}, dr = (e) => {
	let t;
	return function() {
		let n = this, r = arguments;
		t && window.cancelAnimationFrame(t), t = window.requestAnimationFrame(function() {
			e.apply(n, r);
		});
	};
}, fr = {
	assetPath: "./",
	framerate: 1 / 60,
	sounds: !1,
	volume: 100,
	color_spotlight: 15720405,
	shadows: !0,
	theme_surface: "green-felt",
	sound_dieMaterial: "plastic",
	theme_customColorset: null,
	theme_colorset: "white",
	theme_texture: "",
	theme_material: "glass",
	gravity_multiplier: 400,
	light_intensity: .7,
	baseScale: 100,
	strength: 1,
	iterationLimit: 1e3,
	continuousRender: !1,
	onRollComplete: () => {},
	onRerollComplete: () => {},
	onAddDiceComplete: () => {},
	onRemoveDiceComplete: () => {}
}, pr = class {
	constructor(t, n = {}) {
		this.initialized = !1, this.container = document.querySelector(t), this.dimensions = new e.Vector2(this.container.clientWidth, this.container.clientHeight), this.adaptive_timestep = !1, this.last_time = 0, this.running = !1, this.rolling = !1, this.threadid, this.display = {
			currentWidth: null,
			currentHeight: null,
			containerWidth: null,
			containerHeight: null,
			aspect: null,
			scale: null
		}, this.cameraHeight = {
			max: null,
			close: null,
			medium: null,
			far: null
		}, this.scene = new e.Scene(), this.world = new Kn(), this.dice_body_material = new R(), this.sounds_table = {}, this.sounds_dice = [], this.lastSoundType = "", this.lastSoundStep = 0, this.lastSound = 0, this.iteration, this.renderer, this.barrier, this.camera, this.light, this.light_amb, this.desk, this.box_body = {}, this.bodies = [], this.meshes = [], this.diceList = [], this.notationVectors = null, this.dieIndex = 0, this._beforeRenderCallbacks = [], this._afterRenderCallbacks = [], this._lastRenderTime = 0, this._continuousRunning = !1, this._continuousRAF = null, this.soundDelay = 10, this.animstate = "", this.selector = {
			animate: !0,
			rotate: !0,
			intersected: null,
			dice: []
		}, Object.assign(this, fr, n), this.DiceColors = new lr({ assetPath: this.assetPath }), this.DiceFactory = new or({ baseScale: this.baseScale }), this.DiceFactory.setBumpMapping(!0), this.surface = ur[this.theme_surface].surface;
	}
	enableShadows() {
		this.shadows = !0, this.renderer && (this.renderer.shadowMap.enabled = this.shadows), this.light && (this.light.castShadow = this.shadows), this.desk && (this.desk.receiveShadow = this.shadows);
	}
	disableShadows() {
		this.shadows = !1, this.renderer && (this.renderer.shadowMap.enabled = this.shadows), this.light && (this.light.castShadow = this.shadows), this.desk && (this.desk.receiveShadow = this.shadows);
	}
	onBeforeRender(e) {
		return typeof e == "function" && !this._beforeRenderCallbacks.includes(e) && this._beforeRenderCallbacks.push(e), () => this.offBeforeRender(e);
	}
	offBeforeRender(e) {
		let t = this._beforeRenderCallbacks.indexOf(e);
		t !== -1 && this._beforeRenderCallbacks.splice(t, 1);
	}
	onAfterRender(e) {
		return typeof e == "function" && !this._afterRenderCallbacks.includes(e) && this._afterRenderCallbacks.push(e), () => this.offAfterRender(e);
	}
	offAfterRender(e) {
		let t = this._afterRenderCallbacks.indexOf(e);
		t !== -1 && this._afterRenderCallbacks.splice(t, 1);
	}
	render() {
		let e = typeof performance < "u" ? performance.now() : Date.now(), t = this._lastRenderTime ? (e - this._lastRenderTime) / 1e3 : 0;
		this._lastRenderTime = e, t > .1 && (t = .1);
		for (let e = 0; e < this._beforeRenderCallbacks.length; e++) this._beforeRenderCallbacks[e](t);
		this.renderer.render(this.scene, this.camera);
		for (let e = 0; e < this._afterRenderCallbacks.length; e++) this._afterRenderCallbacks[e](t);
	}
	start() {
		if (this._continuousRunning) return;
		this._continuousRunning = !0, this._lastRenderTime = 0;
		let e = () => {
			this._continuousRunning && (this.rolling || this.render(), this._continuousRAF = requestAnimationFrame(e));
		};
		this._continuousRAF = requestAnimationFrame(e);
	}
	stop() {
		this._continuousRunning = !1, this._continuousRAF != null && (cancelAnimationFrame(this._continuousRAF), this._continuousRAF = null);
	}
	async initialize() {
		this.renderer = new e.WebGLRenderer({
			antialias: !0,
			alpha: !0
		}), this.container.appendChild(this.renderer.domElement), this.renderer.shadowMap.enabled = this.shadows, this.renderer.shadowMap.type = e.PCFSoftShadowMap, this.renderer.setClearColor(0, 0), this.setDimensions(this.dimensions), this.world.gravity.set(0, 0, -9.8 * this.gravity_multiplier), this.world.broadphase = new ve(), this.world.solver.iterations = 14, this.world.allowSleep = !0, this.makeWorldBox(), this.resizeWorld(), await this.loadTheme({
			colorset: this.theme_colorset,
			texture: this.theme_texture,
			material: this.theme_material
		}).catch((e) => {
			throw Error("Unable to load theme");
		}), this.sounds && await this.loadSounds().catch((e) => {
			throw Error("Unable to load sounds");
		}), this.initialized = !0, this.renderer.render(this.scene, this.camera), this.continuousRender && this.start();
	}
	makeWorldBox() {
		Object.keys(this.box_body).length && (this.world.removeBody(this.box_body.desk), this.world.removeBody(this.box_body.topWall), this.world.removeBody(this.box_body.bottomWall), this.world.removeBody(this.box_body.leftWall), this.world.removeBody(this.box_body.rightWall));
		let e = new R(), t = new R();
		this.world.addContactMaterial(new L(e, this.dice_body_material, {
			mass: 0,
			friction: .6,
			restitution: .5
		})), this.world.addContactMaterial(new L(t, this.dice_body_material, {
			mass: 0,
			friction: .6,
			restitution: 1
		})), this.world.addContactMaterial(new L(this.dice_body_material, this.dice_body_material, {
			mass: 0,
			friction: .6,
			restitution: .5
		})), this.box_body.desk = new k({
			allowSleep: !1,
			mass: 0,
			shape: new z(),
			material: e
		}), this.world.addBody(this.box_body.desk), this.box_body.topWall = new k({
			allowSleep: !1,
			mass: 0,
			shape: new z(),
			material: t
		}), this.box_body.topWall.quaternion.setFromAxisAngle(new r(1, 0, 0), Math.PI / 2), this.box_body.topWall.position.set(0, this.display.containerHeight * .93, 0), this.world.addBody(this.box_body.topWall), this.box_body.bottomWall = new k({
			allowSleep: !1,
			mass: 0,
			shape: new z(),
			material: t
		}), this.box_body.bottomWall.quaternion.setFromAxisAngle(new r(1, 0, 0), -Math.PI / 2), this.box_body.bottomWall.position.set(0, -this.display.containerHeight * .93, 0), this.world.addBody(this.box_body.bottomWall), this.box_body.leftWall = new k({
			allowSleep: !1,
			mass: 0,
			shape: new z(),
			material: t
		}), this.box_body.leftWall.quaternion.setFromAxisAngle(new r(0, 1, 0), -Math.PI / 2), this.box_body.leftWall.position.set(this.display.containerWidth * .93, 0, 0), this.world.addBody(this.box_body.leftWall), this.box_body.rightWall = new k({
			allowSleep: !1,
			mass: 0,
			shape: new z(),
			material: t
		}), this.box_body.rightWall.quaternion.setFromAxisAngle(new r(0, 1, 0), Math.PI / 2), this.box_body.rightWall.position.set(-this.display.containerWidth * .93, 0, 0), this.world.addBody(this.box_body.rightWall);
	}
	async loadTheme(e) {
		let t;
		t = this.theme_customColorset ? await this.DiceColors.makeColorSet(this.theme_customColorset) : await this.DiceColors.getColorSet(e), this.DiceFactory.applyColorSet(t), this.colorData = t;
	}
	async loadSounds() {
		let e = {
			felt: 7,
			wood_table: 7,
			wood_tray: 7,
			metal: 9
		}, t = {
			coin: 6,
			metal: 12,
			plastic: 15,
			wood: 12
		}, n = this.colorData.texture.material.match(/wood|metal/g);
		if (this.sound_dieMaterial = n ? this.colorData.texture.material : "plastic", !this.sounds_table.hasOwnProperty(this.surface)) {
			this.sounds_table[this.surface] = [];
			let t = e[this.surface];
			for (let e = 1; e <= t; ++e) {
				let t = await this.loadAudio(this.assetPath + "sounds/surfaces/surface_" + this.surface + e + ".mp3");
				this.sounds_table[this.surface].push(t);
			}
		}
		if (!this.sounds_dice.hasOwnProperty("coin")) {
			this.sounds_dice.coin = [];
			let e = t.coin;
			for (let t = 1; t <= e; ++t) {
				let e = await this.loadAudio(this.assetPath + "sounds/dicehit/dicehit_coin" + t + ".mp3");
				this.sounds_dice.coin.push(e);
			}
		}
		if (!this.sounds_dice.hasOwnProperty(this.sound_dieMaterial)) {
			this.sounds_dice[this.sound_dieMaterial] = [];
			let e = t[this.sound_dieMaterial];
			for (let t = 1; t <= e; ++t) {
				let e = await this.loadAudio(this.assetPath + "sounds/dicehit/dicehit_" + this.sound_dieMaterial + t + ".mp3");
				this.sounds_dice[this.sound_dieMaterial].push(e);
			}
		}
	}
	loadAudio(e) {
		return new Promise((t, n) => {
			let r = new Audio();
			r.oncanplaythrough = () => t(r), r.crossOrigin = "anonymous", r.src = e, r.onerror = (e) => n(e);
		}).catch((e) => {
			console.error("Unable to load audio");
		});
	}
	async updateConfig(e = {}) {
		Object.apply(this, e), this.theme_customColorset = e.theme_customColorset ? e.theme_customColorset : null, e.theme_colorset && (this.theme_colorset = e.theme_colorset), e.theme_texture && (this.theme_texture = e.theme_texture), e.theme_material && (this.theme_material = e.theme_material), (e.theme_colorset || e.theme_texture || e.theme_material || e.theme_customColorset) && await this.loadTheme({
			colorset: this.theme_colorset,
			texture: this.theme_texture,
			material: this.theme_material
		});
	}
	setDimensions(t) {
		switch (this.display.currentWidth = this.container.clientWidth / 2, this.display.currentHeight = this.container.clientHeight / 2, t ? (this.display.containerWidth = t.x, this.display.containerHeight = t.y) : (this.display.containerWidth = this.display.currentWidth, this.display.containerHeight = this.display.currentHeight), this.display.aspect = Math.min(this.display.currentWidth / this.display.containerWidth, this.display.currentHeight / this.display.containerHeight), this.display.scale = Math.sqrt(this.display.containerWidth * this.display.containerWidth + this.display.containerHeight * this.display.containerHeight) / 13, this.makeWorldBox(), this.renderer.setSize(this.display.currentWidth * 2, this.display.currentHeight * 2), this.cameraHeight.max = this.display.currentHeight / this.display.aspect / Math.tan(10 * Math.PI / 180), this.cameraHeight.medium = this.cameraHeight.max / 1.5, this.cameraHeight.far = this.cameraHeight.max, this.cameraHeight.close = this.cameraHeight.max / 2, this.camera && this.scene.remove(this.camera), this.camera = new e.PerspectiveCamera(20, this.display.currentWidth / this.display.currentHeight, 1, this.cameraHeight.max * 1.3), this.animstate) {
			case "selector":
				this.camera.position.z = this.selector.dice.length > 9 ? this.cameraHeight.far : this.selector.dice.length < 6 ? this.cameraHeight.close : this.cameraHeight.medium;
				break;
			default: this.camera.position.z = this.cameraHeight.far;
		}
		this.camera.lookAt(new e.Vector3(0, 0, 0));
		let n = Math.max(this.display.containerWidth, this.display.containerHeight);
		this.light && this.scene.remove(this.light), this.light_amb && this.scene.remove(this.light_amb);
		let r = Math.PI;
		this.light = new e.SpotLight(this.color_spotlight, this.light_intensity * r), this.light.position.set(-n / 2, n / 2, n * 3), this.light.target.position.set(0, 0, 0), this.light.distance = n * 5, this.light.decay = 0, this.light.angle = Math.PI / 4, this.light.castShadow = this.shadows, this.light.shadow.camera.near = n / 10, this.light.shadow.camera.far = n * 5, this.light.shadow.camera.fov = 50, this.light.shadow.bias = .001, this.light.shadow.mapSize.width = 1024, this.light.shadow.mapSize.height = 1024, this.scene.add(this.light), this.light_amb = new e.HemisphereLight(16777147, 6776689, this.light_intensity * r), this.scene.add(this.light_amb), this.desk && this.scene.remove(this.desk);
		let i = new e.ShadowMaterial();
		i.opacity = .5, this.desk = new e.Mesh(new e.PlaneGeometry(this.display.containerWidth * 6, this.display.containerHeight * 6, 1, 1), i), this.desk.receiveShadow = this.shadows, this.scene.add(this.desk), this.renderer.render(this.scene, this.camera);
	}
	resizeWorld() {
		let t = dr(() => {
			let t = this.renderer.domElement, n = this.container.clientWidth, r = this.container.clientHeight, i = t.width !== n || t.height !== r;
			return i && this.setDimensions(new e.Vector2(this.container.clientWidth, this.container.clientHeight)), i;
		});
		window.addEventListener("resize", t);
	}
	vectorRand({ x: e, y: t }) {
		let n = Math.random() * Math.PI / 5 - Math.PI / 5 / 2, r = {
			x: e * Math.cos(n) - t * Math.sin(n),
			y: e * Math.sin(n) + t * Math.cos(n)
		};
		return r.x == 0 && (r.x = .01), r.y == 0 && (r.y = .01), r;
	}
	getNotationVectors(e, t, n, r) {
		let i = new er(e);
		for (let e in i.set) {
			let a = this.DiceFactory.get(i.set[e].type), o = i.set[e].num, s = i.set[e].op, c = i.set[e].sid, l = i.set[e].gid, u = i.set[e].glvl, d = i.set[e].func, f = i.set[e].args;
			for (let e = 0; e < o; e++) {
				let e = this.vectorRand(t);
				e.x /= r, e.y /= r;
				let o = {
					x: this.display.containerWidth * (e.x > 0 ? -1 : 1) * .9,
					y: this.display.containerHeight * (e.y > 0 ? -1 : 1) * .9,
					z: Math.random() * 200 + 200
				}, p = Math.abs(e.x / e.y);
				p > 1 ? o.y /= p : o.x *= p;
				let m = this.vectorRand(t);
				m.x /= r, m.y /= r;
				let h, g, _;
				a.shape == "d2" ? (h = {
					x: m.x * n / 10,
					y: m.y * n / 10,
					z: 3e3
				}, g = {
					x: 12 * a.inertia,
					y: 1 * a.inertia,
					z: 0
				}, _ = {
					x: 1,
					y: 1,
					z: Math.random(),
					a: Math.random()
				}) : (h = {
					x: m.x * n,
					y: m.y * n,
					z: -10
				}, g = {
					x: -(Math.random() * e.y * 5 + a.inertia * e.y),
					y: Math.random() * e.x * 5 + a.inertia * e.x,
					z: 0
				}, _ = {
					x: Math.random(),
					y: Math.random(),
					z: Math.random(),
					a: Math.random()
				}), i.vectors.push({
					index: this.dieIndex++,
					type: a.type,
					op: s,
					sid: c,
					gid: l,
					glvl: u,
					func: d,
					args: f,
					pos: o,
					velocity: h,
					angle: g,
					axis: _
				});
			}
		}
		return i;
	}
	swapDiceFace(e, t) {
		let n = this.DiceFactory.get(e.notation.type);
		if (e.resultReason = "forced", n.shape == "d4") {
			this.swapDiceFace_D4(e, t);
			return;
		}
		n.values;
		let r = parseInt(e.getLastValue().value);
		t = parseInt(t), e.notation.type == "d10" && r == 0 && (r = 10), e.notation.type == "d100" && r == 0 && (r = 100), e.notation.type == "d100" && r > 0 && r < 10 && (r *= 10), e.notation.type == "d10" && t == 0 && (t = 10), e.notation.type == "d100" && t == 0 && (t = 100), e.notation.type == "d100" && t > 0 && t < 10 && (t *= 10);
		let i = n.values.indexOf(r), a = n.values.indexOf(t);
		if (i < 0 || a < 0 || i == a) return;
		let o = e.geometry.clone(), s = [], c = [], l = 2;
		n.shape == "d10" && (l = 1);
		let u, d = a + l;
		n.shape == "d2" ? (u = i + 1, d = a + 1) : (u = i + l, d = a + l);
		for (var f = 0, p = o.groups.length; f < p; ++f) {
			let e = o.groups[f].materialIndex;
			if (e == u) {
				s.push(f);
				continue;
			}
			if (e == d) {
				c.push(f);
				continue;
			}
		}
		if (!(s.length <= 0 || c.length <= 0)) {
			for (let e = 0, t = c.length; e < t; e++) o.groups[c[e]].materialIndex = u;
			for (let e = 0, t = s.length; e < t; e++) o.groups[s[e]].materialIndex = d;
			e.geometry = o, e.result = [];
		}
	}
	swapDiceFace_D4(e, t) {
		let n = this.DiceFactory.get(e.notation.type), r = parseInt(e.getLastValue().value);
		if (t = parseInt(t), !(r >= 1 && r <= 4)) return;
		let i = t - r, a = e.geometry.clone();
		for (let e = 0, t = a.groups.length; e < t; ++e) {
			let t = a.groups[e], n = t.materialIndex;
			if (n != 0) {
				for (n += i - 1; n > 4;) n -= 4;
				for (; n < 1;) n += 4;
				t.materialIndex = n + 1;
			}
		}
		i != 0 && (i < 0 && (i += 4), e.material = this.DiceFactory.createMaterials(n, 0, 0, !1, i)), e.geometry = a;
	}
	spawnDice(e, t = !1) {
		let { pos: n, axis: i, angle: a, velocity: o } = e, s;
		if (t) s = t, s.stopped = 0, this.world.removeBody(s.body);
		else {
			if (s = this.DiceFactory.create(e.type, this.colorData), !s) return;
			s.notation = e, s.result = [], s.stopped = 0, s.castShadow = this.shadows, this.scene.add(s), this.diceList.push(s);
		}
		s.body = new k({
			allowSleep: !0,
			sleepSpeedLimit: 75,
			sleepTimeLimit: .9,
			mass: s.mass,
			shape: s.geometry.cannon_shape,
			material: this.dice_body_material
		}), s.body.type = k.DYNAMIC, s.body.position.set(n.x, n.y, n.z), s.body.quaternion.setFromAxisAngle(new r(i.x, i.y, i.z), i.a * Math.PI * 2), s.body.angularVelocity.set(a.x, a.y, a.z), s.body.velocity.set(o.x, o.y, o.z), s.body.linearDamping = .1, s.body.angularDamping = .1, s.body.diceShape = s.shape, s.body.sleepState = 0, s.body.addEventListener("collide", this.eventCollide.bind(this)), this.world.addBody(s.body);
	}
	eventCollide({ body: e, target: t }) {
		if (this.animstate == "simulate" || !this.sounds || !e || this.volume <= 0) return;
		let n = Date.now(), r = e.mass > 0 ? "dice" : "table";
		if (!((this.lastSoundStep == e.world.stepnumber || this.lastSound > n) && r != "dice") && !((this.lastSoundStep == e.world.stepnumber || this.lastSound > n) && r == "dice" && this.lastSoundType == "dice")) {
			if (e.mass > 0) {
				let t = e.velocity.length();
				if (t < 250) return;
				let n;
				n = e.diceShape === "d2" ? this.sounds_dice.coin[Math.floor(Math.random() * this.sounds_dice.coin.length)] : this.sounds_dice[this.sound_dieMaterial][Math.floor(Math.random() * this.sounds_dice[this.sound_dieMaterial].length)], n && (n.volume = Math.min(t / 8e3, this.volume / 100), n.play().catch((e) => {})), this.lastSoundType = "dice";
			} else {
				let e = t.velocity.length();
				if (e < 250) return;
				let n = this.surface, r = this.sounds_table[n], i = r[Math.floor(Math.random() * r.length)];
				i && (i.volume = Math.min(e / 8e3, this.volume / 100), i.play().catch((e) => {})), this.lastSoundType = "table";
			}
			this.lastSoundStep = e.world.stepnumber, this.lastSound = n + this.soundDelay;
		}
	}
	checkForRethrow(e) {
		return e.notation.func && e.notation.func.toLowerCase(), !1;
	}
	throwFinished() {
		let e = this.iteration > this.iterationLimit;
		for (let t = 0, n = this.diceList.length; t < n; ++t) {
			let n = this.diceList[t], i = k.SLEEPING;
			if (n.body.sleepState < i && !e) return !1;
			if (n.body.sleepState == i || e) {
				if (n.body.type === k.KINEMATIC) continue;
				let e = !1;
				if (n.result.length == 0 ? (n.storeRolledValue(n.resultReason), e = this.checkForRethrow(n)) : n.result.length > 0 && n.rerolling && (n.rerolling = !1, n.storeRolledValue("reroll"), e = this.checkForRethrow(n)), e) return n.rerolls += 1, n.rerolling = !0, n.body.wakeUp(), n.body.type = k.DYNAMIC, n.body.angularVelocity = new r(25, 25, 25), n.body.velocity = new r(0, 0, 3e3), !1;
				n.rerolling = !1, n.body.type = k.KINEMATIC;
			}
		}
		return !0;
	}
	simulateThrow() {
		for (this.animstate = "simulate", this.iteration = 0, this.rolling = !0; !this.throwFinished(!0);) ++this.iteration, this.world.step(this.framerate);
	}
	animateThrow(e, t) {
		this.animstate = "throw";
		let n = Date.now();
		this.last_time = this.last_time || n - this.framerate * 1e3;
		let r = (n - this.last_time) / 1e3;
		++this.iteration;
		let i = Math.floor(r / this.framerate);
		for (let e = 0; e < i; e++) this.world.step(this.framerate), ++this.steps;
		for (let e in this.scene.children) {
			let t = this.scene.children[e];
			t.body != null && (t.position.copy(t.body.position), t.quaternion.copy(t.body.quaternion));
		}
		if (this.render(), this.last_time += i * this.framerate * 1e3, this.running == e && this.throwFinished()) {
			this.running = !1, this.rolling = !1, t && t.call(this, this.notationVectors), this.running = Date.now(), this.animateAfterThrow(this.running);
			return;
		}
		this.running == e && ((e, t, n, i, a) => {
			!n && r < this.framerate ? setTimeout(() => {
				requestAnimationFrame(() => {
					e.call(this, t, i, a);
				});
			}, (this.framerate - r) * 1e3) : requestAnimationFrame(() => {
				e.call(this, t, i, a);
			});
		}).bind(this)(this.animateThrow, e, this.adaptive_timestep, t);
	}
	animateAfterThrow(e) {
		this.animstate = "afterthrow";
		let t = Date.now(), n = (t - this.last_time) / 1e3;
		n > 3 && (n = this.framerate), this.running = !1, this.last_time = t, this.render(), this.running == e && ((e, t, r) => {
			!r && n < this.framerate ? setTimeout(() => {
				requestAnimationFrame(() => {
					e.call(this, t);
				});
			}, (this.framerate - n) * 1e3) : requestAnimationFrame(() => {
				e.call(this, t);
			});
		}).bind(this)(this.animateAfterThrow, e, this.adaptive_timestep);
	}
	startClickThrow(e) {
		this.rolling &&= (this.clearDice(), !1);
		let t = {
			x: (Math.random() * 2 - .5) * this.display.currentWidth,
			y: -(Math.random() * 2 - .5) * this.display.currentHeight
		}, n = Math.sqrt(t.x * t.x + t.y * t.y) + 100, r = (Math.random() + 3) * n * this.strength;
		return this.getNotationVectors(e, t, r, n);
	}
	clearDice() {
		this.running = !1;
		let e;
		for (; e = this.diceList.pop();) this.scene.remove(e), e.body && this.world.removeBody(e.body);
		this.renderer.render(this.scene, this.camera), setTimeout(() => {
			this.renderer.render(this.scene, this.camera);
		}, 100);
	}
	getDiceResults(e) {
		if (e !== void 0) return {
			type: this.diceList[e].shape,
			sides: parseInt(this.diceList[e].shape.substring(1)),
			id: e,
			...this.diceList[e].result.at(-1)
		};
		let t = 0, n = this.notationVectors.constant ? parseInt(`${this.notationVectors.op}${this.notationVectors.constant}`) : 0, r = n;
		return {
			notation: this.notationVectors.notation,
			sets: this.notationVectors.set.map((e) => {
				let n = t + e.num - 1, i = 0, a = [];
				for (let r = t; r <= n; r++) {
					if (this.diceList[t].result.at(-1).reason === "remove") {
						t++;
						continue;
					}
					a.push({
						type: e.type,
						sides: parseInt(e.type.substring(1)),
						id: t,
						...this.diceList[t].result.at(-1)
					}), i += this.diceList[t].result.at(-1).value, t++;
				}
				let o = {
					num: e.num,
					type: e.type,
					sides: parseInt(e.type.substring(1)),
					rolls: a,
					total: i
				};
				return r += i, o;
			}),
			modifier: n,
			total: r
		};
	}
	async roll(e) {
		if (this.notationVectors = this.startClickThrow(e), this.notationVectors) return new Promise((e, t) => {
			this.rollDice(() => {
				let t = this.getDiceResults();
				this.onRollComplete(t);
				let n = new CustomEvent("rollComplete", { detail: t });
				document.dispatchEvent(n), e(t);
			});
		});
	}
	async reroll(e) {
		return this.rolling = !0, this.running = Date.now(), this.iteration = 0, this.last_time = 0, new Promise((t, n) => {
			e.forEach((e) => {
				let t = this.diceList[e];
				t.rerolls += 1, t.rerolling = !0, t.body.wakeUp(), t.body.type = k.DYNAMIC, t.body.angularVelocity = new r(25, 25, 25), t.body.velocity = new r(0, 0, 3e3);
			}), this.animateThrow(this.running, () => {
				let n = e.map((e) => this.getDiceResults(e));
				this.onRerollComplete(n);
				let r = new CustomEvent("rerollComplete", { detail: n });
				document.dispatchEvent(r), t(n);
			});
		});
	}
	async add(e) {
		let t = this.diceList.length;
		if (!t) return this.roll(e);
		let n = this.startClickThrow(e), r = [];
		for (let e = 0, t = n.vectors.length; e < t; ++e) this.spawnDice(n.vectors[e]);
		this.simulateThrow(), this.steps = 0, this.iteration = 0;
		for (let e = 0, i = n.vectors.length; e < i; ++e) {
			let i = t + e;
			this.diceList[i] && (this.spawnDice(n.vectors[e], this.diceList[i]), r.push(i));
		}
		if (n.result && n.result.length > 0) for (let e = 0; e < n.result.length; e++) {
			let r = t + e, i = this.diceList[r];
			i && i.getLastValue().value != n.result[e] && this.swapDiceFace(i, n.result[e]);
		}
		for (let e of r) {
			let t = this.diceList[e];
			t && t.body && t.body.wakeUp();
		}
		return this.notationVectors = er.mergeNotation(this.notationVectors, n), new Promise((e, t) => {
			let n = () => {
				let t = r.map((e) => this.getDiceResults(e));
				this.onAddDiceComplete(t);
				let n = new CustomEvent("addDiceComplete", { detail: t });
				document.dispatchEvent(n), e(t);
			};
			this.rolling = !0, this.running = Date.now(), this.last_time = 0, this.animateThrow(this.running, n);
		});
	}
	async remove(e) {
		return new Promise((t, n) => {
			let r = [];
			e.forEach((e) => {
				let t = this.diceList[e];
				t.body && this.world.removeBody(t.body), this.scene.remove(t), t.storeRolledValue("remove"), r.push(this.getDiceResults(e));
			}), this.renderer.render(this.scene, this.camera), this.onRemoveDiceComplete(r);
			let i = new CustomEvent("removeDiceComplete", { detail: r });
			document.dispatchEvent(i), t(r);
		});
	}
	rollDice(e) {
		if (this.notationVectors.error) {
			e.call(this);
			return;
		}
		this.clearDice();
		for (let e = 0, t = this.notationVectors.vectors.length; e < t; ++e) this.spawnDice(this.notationVectors.vectors[e]);
		this.simulateThrow(), this.steps = 0, this.iteration = 0;
		for (let e = 0, t = this.diceList.length; e < t; ++e) this.diceList[e] && this.spawnDice(this.notationVectors.vectors[e], this.diceList[e]);
		if (this.notationVectors.result && this.notationVectors.result.length > 0) for (let e = 0; e < this.notationVectors.result.length; e++) {
			let t = this.diceList[e];
			t && t.getLastValue().value != this.notationVectors.result[e] && this.swapDiceFace(t, this.notationVectors.result[e]);
		}
		this.rolling = !0, this.running = Date.now(), this.last_time = 0, this.animateThrow(this.running, e);
	}
};
//#endregion
export { pr as default };
