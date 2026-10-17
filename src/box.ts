import { Anchor, getOptionKeys } from "./anchor";
import type { AnchorOptions, Defaults } from "./anchor";
import { TAU } from "./boilerplate";
import { Rect, type RectOptions } from "./rect";
import { Shape } from "./shape";
import type { Vector, VectorOptions } from "./vector";

// ----- BoxRect ----- //

class BoxRect extends Rect {
  // prevent double-creation in parent.copyGraph()
  // only create in Box.create()
  copyGraph(): this {
    return this;
  }
}

// ----- Box ----- //

const faceNames = ["frontFace", "rearFace", "leftFace", "rightFace", "topFace", "bottomFace"] as const;

type FaceName = (typeof faceNames)[number];

export interface BoxOptions extends AnchorOptions {
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  stroke?: number | boolean;
  fill?: boolean;
  backface?: boolean | string;
  front?: VectorOptions;
  visible?: boolean;
  frontFace?: boolean | string;
  rearFace?: boolean | string;
  leftFace?: boolean | string;
  rightFace?: boolean | string;
  topFace?: boolean | string;
  bottomFace?: boolean | string;
}

const boxDefaults: Defaults = { ...Shape.defaults };
delete boxDefaults.path;
faceNames.forEach((faceName) => {
  boxDefaults[faceName] = true;
});
Object.assign(boxDefaults, {
  width: 1,
  height: 1,
  depth: 1,
  fill: true
});

export class Box extends Anchor {
  constructor(options?: BoxOptions) {
    super(options);
  }
  static defaults: Defaults = boxDefaults;

  static optionKeys: string[] = getOptionKeys(Anchor.optionKeys, this.defaults);

  declare width: number;
  declare height: number;
  declare depth: number;
  declare color: string;
  declare stroke: number | boolean;
  declare fill: boolean;
  declare backface: boolean | string;
  declare front: Vector | VectorOptions;
  declare visible: boolean;
  declare frontFace: boolean | string;
  declare rearFace: boolean | string;
  declare leftFace: boolean | string;
  declare rightFace: boolean | string;
  declare topFace: boolean | string;
  declare bottomFace: boolean | string;
  declare frontFaceRect: BoxRect | undefined;
  declare rearFaceRect: BoxRect | undefined;
  declare leftFaceRect: BoxRect | undefined;
  declare rightFaceRect: BoxRect | undefined;
  declare topFaceRect: BoxRect | undefined;
  declare bottomFaceRect: BoxRect | undefined;

  create(options: BoxOptions): void {
    super.create(options);
    this.updatePath();
    // HACK reset fill to trigger face setter
    // oxlint-disable-next-line no-self-assign
    this.fill = this.fill;
  }

  updatePath(): void {
    // reset all faces to trigger setters
    faceNames.forEach((faceName) => {
      // oxlint-disable-next-line no-self-assign
      this[faceName] = this[faceName];
    });
  }

  setFace(faceName: FaceName, value: boolean | string): void {
    const rectProperty = `${faceName}Rect` as const;
    let rect = this[rectProperty];
    // remove if false
    if (!value) {
      if (rect) {
        this.removeChild(rect);
      }
      return;
    }
    // update & add face
    const options = this.getFaceOptions(faceName);
    options.color = typeof value == "string" ? value : this.color;

    if (rect) {
      // update previous
      rect.setOptions(options);
    } else {
      // create new
      rect = this[rectProperty] = new BoxRect(options);
    }
    rect.updatePath();
    this.addChild(rect);
  }

  getFaceOptions(faceName: FaceName): RectOptions {
    return {
      frontFace: {
        width: this.width,
        height: this.height,
        translate: { z: this.depth / 2 }
      },
      rearFace: {
        width: this.width,
        height: this.height,
        translate: { z: -this.depth / 2 },
        rotate: { y: TAU / 2 }
      },
      leftFace: {
        width: this.depth,
        height: this.height,
        translate: { x: -this.width / 2 },
        rotate: { y: -TAU / 4 }
      },
      rightFace: {
        width: this.depth,
        height: this.height,
        translate: { x: this.width / 2 },
        rotate: { y: TAU / 4 }
      },
      topFace: {
        width: this.width,
        height: this.depth,
        translate: { y: -this.height / 2 },
        rotate: { x: -TAU / 4 }
      },
      bottomFace: {
        width: this.width,
        height: this.depth,
        translate: { y: this.height / 2 },
        rotate: { x: TAU / 4 }
      }
    }[faceName];
  }
}

// ----- set face setters ----- //

faceNames.forEach((faceName) => {
  const _faceName = "_" + faceName;
  Object.defineProperty(Box.prototype, faceName, {
    get(this: Box) {
      return (this as unknown as Record<string, unknown>)[_faceName];
    },
    set(this: Box, value: boolean | string) {
      (this as unknown as Record<string, unknown>)[_faceName] = value;
      this.setFace(faceName, value);
    }
  });
});

// ----- set face properties ----- //

const childProperties = ["color", "stroke", "fill", "backface", "front", "visible"] as const;
childProperties.forEach((property) => {
  // use proxy property for custom getter & setter
  const _prop = "_" + property;
  Object.defineProperty(Box.prototype, property, {
    get(this: Box) {
      return (this as unknown as Record<string, unknown>)[_prop];
    },
    set(this: Box, value: unknown) {
      (this as unknown as Record<string, unknown>)[_prop] = value;
      faceNames.forEach((faceName) => {
        const rect = this[`${faceName}Rect`];
        const isFaceColor = typeof this[faceName] == "string";
        const isColorUnderwrite = property == "color" && isFaceColor;
        if (rect && !isColorUnderwrite) {
          (rect as unknown as Record<string, unknown>)[property] = value;
        }
      });
    }
  });
});
