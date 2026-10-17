import { type Defaults, getOptionKeys } from "./anchor";
import { TAU } from "./boilerplate";
import { Shape, type ShapeOptions } from "./shape";

export interface PolygonOptions extends ShapeOptions {
  sides?: number;
  radius?: number;
}

export class Polygon extends Shape {
  constructor(options?: PolygonOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Shape.defaults,
    sides: 3,
    radius: 0.5
  };

  static optionKeys: string[] = getOptionKeys(Shape.optionKeys, this.defaults);

  declare sides: number;
  declare radius: number;

  setPath(): void {
    this.path = [];
    for (let i = 0; i < this.sides; i++) {
      const theta = (i / this.sides) * TAU - TAU / 4;
      const x = Math.cos(theta) * this.radius;
      const y = Math.sin(theta) * this.radius;
      this.path.push({ x: x, y: y });
    }
  }
}
