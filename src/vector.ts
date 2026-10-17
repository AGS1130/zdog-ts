import { lerp, TAU } from "./boilerplate";

export interface VectorOptions {
  x?: number;
  y?: number;
  z?: number;
}

type Axis = "x" | "y" | "z";

export class Vector {
  x: number = 0;
  y: number = 0;
  z: number = 0;

  constructor(position?: VectorOptions) {
    this.set(position);
  }

  // 'pos' = 'position'
  set(pos?: VectorOptions | null): this {
    this.x = (pos && pos.x) || 0;
    this.y = (pos && pos.y) || 0;
    this.z = (pos && pos.z) || 0;
    return this;
  }

  // set coordinates without sanitizing
  // vec.write({ y: 2 }) only sets y coord
  write(pos?: VectorOptions | null): this {
    if (!pos) {
      return this;
    }
    this.x = pos.x != undefined ? pos.x : this.x;
    this.y = pos.y != undefined ? pos.y : this.y;
    this.z = pos.z != undefined ? pos.z : this.z;
    return this;
  }

  rotate(rotation?: VectorOptions | null): this {
    if (!rotation) {
      return this;
    }
    this.rotateZ(rotation.z);
    this.rotateY(rotation.y);
    this.rotateX(rotation.x);
    return this;
  }

  rotateZ(angle?: number): void {
    rotateProperty(this, angle, "x", "y");
  }

  rotateX(angle?: number): void {
    rotateProperty(this, angle, "y", "z");
  }

  rotateY(angle?: number): void {
    rotateProperty(this, angle, "x", "z");
  }

  isSame(pos?: VectorOptions | null): boolean {
    if (!pos) {
      return false;
    }
    return this.x === pos.x && this.y === pos.y && this.z === pos.z;
  }

  add(pos?: VectorOptions | null): this {
    if (!pos) {
      return this;
    }
    this.x += pos.x || 0;
    this.y += pos.y || 0;
    this.z += pos.z || 0;
    return this;
  }

  subtract(pos?: VectorOptions | null): this {
    if (!pos) {
      return this;
    }
    this.x -= pos.x || 0;
    this.y -= pos.y || 0;
    this.z -= pos.z || 0;
    return this;
  }

  multiply(pos?: number | VectorOptions | null): this {
    if (pos == undefined) {
      return this;
    }
    // multiple all values by same number
    if (typeof pos == "number") {
      this.x *= pos;
      this.y *= pos;
      this.z *= pos;
    } else {
      // multiply object
      this.x *= pos.x != undefined ? pos.x : 1;
      this.y *= pos.y != undefined ? pos.y : 1;
      this.z *= pos.z != undefined ? pos.z : 1;
    }
    return this;
  }

  transform(translation: VectorOptions, rotation: VectorOptions, scale: number | VectorOptions): this {
    this.multiply(scale);
    this.rotate(rotation);
    this.add(translation);
    return this;
  }

  lerp(pos: VectorOptions, alpha: number): this {
    this.x = lerp(this.x, pos.x || 0, alpha);
    this.y = lerp(this.y, pos.y || 0, alpha);
    this.z = lerp(this.z, pos.z || 0, alpha);
    return this;
  }

  magnitude(): number {
    const sum = this.x * this.x + this.y * this.y + this.z * this.z;
    return getMagnitudeSqrt(sum);
  }

  magnitude2d(): number {
    const sum = this.x * this.x + this.y * this.y;
    return getMagnitudeSqrt(sum);
  }

  copy(): Vector {
    return new Vector(this);
  }
}

function rotateProperty(vec: Vector, angle: number | undefined, propA: Axis, propB: Axis): void {
  if (!angle || angle % TAU === 0) {
    return;
  }
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const a = vec[propA];
  const b = vec[propB];
  vec[propA] = a * cos - b * sin;
  vec[propB] = b * cos + a * sin;
}

function getMagnitudeSqrt(sum: number): number {
  // PERF: check if sum ~= 1 and skip sqrt
  if (Math.abs(sum - 1) < 0.00000001) {
    return 1;
  }
  return Math.sqrt(sum);
}
