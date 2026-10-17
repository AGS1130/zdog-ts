import { type Defaults, getOptionKeys } from "./anchor";
import { Shape, type ShapeOptions } from "./shape";

export interface RectOptions extends ShapeOptions {
  width?: number;
  height?: number;
}

export class Rect extends Shape {
  constructor(options?: RectOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Shape.defaults,
    width: 1,
    height: 1
  };

  static optionKeys: string[] = getOptionKeys(Shape.optionKeys, this.defaults);

  declare width: number;
  declare height: number;

  setPath(): void {
    const x = this.width / 2;
    const y = this.height / 2;
    this.path = [
      { x: -x, y: -y },
      { x: x, y: -y },
      { x: x, y: y },
      { x: -x, y: y }
    ];
  }
}
