import { extend, modulo, TAU } from "./boilerplate";
import { CanvasRenderer } from "./canvas-renderer";
import type { RenderContext, Renderer } from "./renderer";
import { SvgRenderer } from "./svg-renderer";
import { Vector, type VectorOptions } from "./vector";

export interface AnchorOptions {
  rotate?: VectorOptions;
  translate?: VectorOptions;
  scale?: number | VectorOptions;
  addTo?: Anchor;
}

export type Defaults = Record<string, unknown>;

// anchor options plus any subclass options, e.g. shape.copy({ color: "red" })
export type CopyOptions = AnchorOptions & Record<string, unknown>;

const onePoint = { x: 1, y: 1, z: 1 };

// Instance properties are `declare`d, never initialized as class fields.
// Values are assigned in create(), which runs from the base constructor, so
// subclass field initializers would clobber them and shadow prototype accessors.
export class Anchor {
  static defaults: Defaults = {};

  static optionKeys: string[] = ["rotate", "translate", "scale", "addTo"];

  declare children: Anchor[];
  declare translate: Vector;
  declare rotate: Vector;
  declare scale: Vector;
  declare origin: Vector;
  declare renderOrigin: Vector;
  declare addTo: Anchor | undefined;
  declare sortValue: number;
  declare _flatGraph: Anchor[] | undefined;

  constructor(options?: AnchorOptions) {
    this.create(options || {});
  }

  create(options: AnchorOptions): void {
    this.children = [];
    // set defaults & options
    extend(this, (this.constructor as typeof Anchor).defaults);
    this.setOptions(options);

    // transform
    this.translate = new Vector(options.translate);
    this.rotate = new Vector(options.rotate);
    // scale is still the raw option value until it is replaced here
    this.scale = new Vector(onePoint).multiply(this.scale as number | VectorOptions | undefined);
    // origin
    this.origin = new Vector();
    this.renderOrigin = new Vector();

    if (this.addTo) {
      this.addTo.addChild(this);
    }
  }

  setOptions(options: AnchorOptions): void {
    const optionKeys = (this.constructor as typeof Anchor).optionKeys;
    const self = this as unknown as Record<string, unknown>;

    for (const key in options) {
      if (optionKeys.includes(key)) {
        self[key] = (options as Record<string, unknown>)[key];
      }
    }
  }

  addChild(shape: Anchor): void {
    if (this.children.includes(shape)) {
      return;
    }
    shape.remove(); // remove previous parent
    shape.addTo = this; // keep parent reference
    this.children.push(shape);
  }

  removeChild(shape: Anchor): void {
    const index = this.children.indexOf(shape);
    if (index != -1) {
      this.children.splice(index, 1);
    }
  }

  remove(): void {
    if (this.addTo) {
      this.addTo.removeChild(this);
    }
  }

  // ----- update ----- //

  update(): void {
    // update self
    this.reset();
    // update children
    this.children.forEach((child) => {
      child.update();
    });
    this.transform(this.translate, this.rotate, this.scale);
  }

  reset(): void {
    this.renderOrigin.set(this.origin);
  }

  transform(translation: Vector, rotation: Vector, scale: Vector): void {
    this.renderOrigin.transform(translation, rotation, scale);
    // transform children
    this.children.forEach((child) => {
      child.transform(translation, rotation, scale);
    });
  }

  updateGraph(): void {
    this.update();
    this.updateFlatGraph();
    this.flatGraph.forEach((item) => {
      item.updateSortValue();
    });
    // z-sort
    this.flatGraph.sort(Anchor.shapeSorter);
  }

  static shapeSorter(this: void, a: Anchor, b: Anchor): number {
    return a.sortValue - b.sortValue;
  }

  // custom getter to check for flatGraph before using it
  get flatGraph(): Anchor[] {
    if (!this._flatGraph) {
      this.updateFlatGraph();
    }
    return this._flatGraph as Anchor[];
  }

  set flatGraph(graph: Anchor[]) {
    this._flatGraph = graph;
  }

  updateFlatGraph(): void {
    this.flatGraph = this.getFlatGraph();
  }

  // return Array of self & all child graph items
  getFlatGraph(): Anchor[] {
    const flatGraph: Anchor[] = [this];
    return this.addChildFlatGraph(flatGraph);
  }

  addChildFlatGraph(flatGraph: Anchor[]): Anchor[] {
    this.children.forEach((child) => {
      const childFlatGraph = child.getFlatGraph();
      flatGraph.push(...childFlatGraph);
    });
    return flatGraph;
  }

  updateSortValue(): void {
    this.sortValue = this.renderOrigin.z;
  }

  // ----- render ----- //

  render(_ctx: RenderContext, _renderer: Renderer): void {}

  // TODO refactor out CanvasRenderer so its not a dependency within anchor.js
  renderGraphCanvas(ctx: CanvasRenderingContext2D): void {
    if (!ctx) {
      throw new Error("ctx is " + ctx + ". " + "Canvas context required for render. Check .renderGraphCanvas( ctx ).");
    }
    this.flatGraph.forEach((item) => {
      item.render(ctx, CanvasRenderer);
    });
  }

  renderGraphSvg(svg: SVGElement): void {
    if (!svg) {
      throw new Error("svg is " + svg + ". " + "SVG required for render. Check .renderGraphSvg( svg ).");
    }
    this.flatGraph.forEach((item) => {
      item.render(svg, SvgRenderer);
    });
  }

  // ----- misc ----- //

  copy(options?: CopyOptions): this {
    // copy options
    const itemOptions: Record<string, unknown> = {};
    const optionKeys = (this.constructor as typeof Anchor).optionKeys;
    const self = this as unknown as Record<string, unknown>;
    optionKeys.forEach((key) => {
      itemOptions[key] = self[key];
    });
    // add set options
    extend(itemOptions, options);
    const ItemClass = this.constructor as new (options: Record<string, unknown>) => this;
    return new ItemClass(itemOptions);
  }

  copyGraph(options?: CopyOptions): this {
    const clone = this.copy(options);
    this.children.forEach((child) => {
      child.copyGraph({
        addTo: clone
      });
    });
    return clone;
  }

  normalizeRotate(): void {
    this.rotate.x = modulo(this.rotate.x, TAU);
    this.rotate.y = modulo(this.rotate.y, TAU);
    this.rotate.z = modulo(this.rotate.z, TAU);
  }

  // ----- subclass ----- //

  // Zdog-style subclassing, e.g. Zdog.Shape.subclass({ sides: 5 }).
  // ES class subclasses should set static defaults & optionKeys instead.
  static subclass<T extends typeof Anchor>(this: T, defaults?: Defaults): T {
    const Item = class extends (this as typeof Anchor) {} as unknown as T;
    Item.defaults = { ...this.defaults, ...defaults };
    Item.optionKeys = getOptionKeys(this.optionKeys, Item.defaults);
    return Item;
  }
}

// add defaults keys to super optionKeys, dedupe
export function getOptionKeys(superOptionKeys: string[], defaults: Defaults): string[] {
  const optionKeys = superOptionKeys.slice(0);
  Object.keys(defaults).forEach((key) => {
    if (!optionKeys.includes(key)) {
      optionKeys.push(key);
    }
  });
  return optionKeys;
}
