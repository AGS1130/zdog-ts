import { type Defaults, getOptionKeys } from "./anchor";
import { Shape } from "./shape";
import type { PathPart, ShapeOptions } from "./shape";

export interface EllipseOptions extends ShapeOptions {
  diameter?: number;
  width?: number;
  height?: number;
  quarters?: number;
}

export class Ellipse extends Shape {
  constructor(options?: EllipseOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Shape.defaults,
    diameter: 1,
    width: undefined,
    height: undefined,
    quarters: 4,
    closed: false
  };

  static optionKeys: string[] = getOptionKeys(Shape.optionKeys, this.defaults);

  declare diameter: number;
  declare width: number | undefined;
  declare height: number | undefined;
  declare quarters: number;

  setPath(): void {
    const width = this.width != undefined ? this.width : this.diameter;
    const height = this.height != undefined ? this.height : this.diameter;
    const x = width / 2;
    const y = height / 2;
    const path: PathPart[] = [
      { x: 0, y: -y },
      {
        arc: [
          // top right
          { x: x, y: -y },
          { x: x, y: 0 }
        ]
      }
    ];
    // bottom right
    if (this.quarters > 1) {
      path.push({
        arc: [
          { x: x, y: y },
          { x: 0, y: y }
        ]
      });
    }
    // bottom left
    if (this.quarters > 2) {
      path.push({
        arc: [
          { x: -x, y: y },
          { x: -x, y: 0 }
        ]
      });
    }
    // top left
    if (this.quarters > 3) {
      path.push({
        arc: [
          { x: -x, y: -y },
          { x: 0, y: -y }
        ]
      });
    }
    this.path = path;
  }
}
