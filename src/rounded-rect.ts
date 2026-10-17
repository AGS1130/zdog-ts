import { type Defaults, getOptionKeys } from "./anchor";
import { Shape } from "./shape";
import type { PathPart, ShapeOptions } from "./shape";

export interface RoundedRectOptions extends ShapeOptions {
  width?: number;
  height?: number;
  cornerRadius?: number;
}

export class RoundedRect extends Shape {
  constructor(options?: RoundedRectOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Shape.defaults,
    width: 1,
    height: 1,
    cornerRadius: 0.25,
    closed: false
  };

  static optionKeys: string[] = getOptionKeys(Shape.optionKeys, this.defaults);

  declare width: number;
  declare height: number;
  declare cornerRadius: number;

  setPath(): void {
    const xA = this.width / 2;
    const yA = this.height / 2;
    const shortSide = Math.min(xA, yA);
    const cornerRadius = Math.min(this.cornerRadius, shortSide);
    const xB = xA - cornerRadius;
    const yB = yA - cornerRadius;
    const path: PathPart[] = [
      // top right corner
      { x: xB, y: -yA },
      {
        arc: [
          { x: xA, y: -yA },
          { x: xA, y: -yB }
        ]
      }
    ];
    // bottom right corner
    if (yB) {
      path.push({ x: xA, y: yB });
    }
    path.push({
      arc: [
        { x: xA, y: yA },
        { x: xB, y: yA }
      ]
    });
    // bottom left corner
    if (xB) {
      path.push({ x: -xB, y: yA });
    }
    path.push({
      arc: [
        { x: -xA, y: yA },
        { x: -xA, y: yB }
      ]
    });
    // top left corner
    if (yB) {
      path.push({ x: -xA, y: -yB });
    }
    path.push({
      arc: [
        { x: -xA, y: -yA },
        { x: -xB, y: -yA }
      ]
    });

    // back to top right corner
    if (xB) {
      path.push({ x: xB, y: -yA });
    }

    this.path = path;
  }
}
