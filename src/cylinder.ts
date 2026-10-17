import { type Defaults, getOptionKeys } from "./anchor";
import { TAU } from "./boilerplate";
import { Ellipse } from "./ellipse";
import { Group, type GroupOptions } from "./group";
import { PathCommand } from "./path-command";
import type { RenderContext, RenderElement, Renderer } from "./renderer";
import { Shape, type ShapeOptions } from "./shape";

const svgURI = "http://www.w3.org/2000/svg";

// ----- CylinderGroup ----- //

interface CylinderGroupOptions extends GroupOptions {
  color?: string;
}

class CylinderGroup extends Group {
  constructor(options?: CylinderGroupOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Group.defaults,
    color: "#333",
    updateSort: true
  };

  static optionKeys: string[] = getOptionKeys(Group.optionKeys, this.defaults);

  declare color: string;
  declare pathCommands: PathCommand[];
  declare frontBase: Ellipse;
  declare rearBase: Ellipse;
  declare svgElement: SVGPathElement | undefined;

  create(options: CylinderGroupOptions): void {
    super.create(options);
    this.pathCommands = [new PathCommand("move", [{}]), new PathCommand("line", [{}])];
  }

  render(ctx: RenderContext, renderer: Renderer): void {
    this.renderCylinderSurface(ctx, renderer);
    super.render(ctx, renderer);
  }

  renderCylinderSurface(ctx: RenderContext, renderer: Renderer): void {
    if (!this.visible) {
      return;
    }
    // render cylinder surface
    const elem = this.getRenderElement(ctx, renderer);
    const frontBase = this.frontBase;
    const rearBase = this.rearBase;
    const scale = frontBase.renderNormal.magnitude();
    const strokeWidth = frontBase.diameter * scale + frontBase.getLineWidth();
    // set path command render points
    this.pathCommands[0].renderPoints[0].set(frontBase.renderOrigin);
    this.pathCommands[1].renderPoints[0].set(rearBase.renderOrigin);

    if (renderer.isCanvas) {
      (ctx as CanvasRenderingContext2D).lineCap = "butt"; // nice
    }
    renderer.renderPath(ctx, elem, this.pathCommands);
    renderer.stroke(ctx, elem, true, this.color, strokeWidth);
    renderer.end(ctx, elem);

    if (renderer.isCanvas) {
      (ctx as CanvasRenderingContext2D).lineCap = "round"; // reset
    }
  }

  getRenderElement(_ctx: RenderContext, renderer: Renderer): RenderElement {
    if (!renderer.isSvg) {
      return;
    }
    if (!this.svgElement) {
      // create svgElement
      this.svgElement = document.createElementNS(svgURI, "path");
    }
    return this.svgElement;
  }

  // prevent double-creation in parent.copyGraph()
  // only create in Cylinder.create()
  copyGraph(): this {
    return this;
  }
}

// ----- Cylinder ----- //

export interface CylinderOptions extends ShapeOptions {
  diameter?: number;
  length?: number;
  frontFace?: boolean | string;
}

export class Cylinder extends Shape {
  constructor(options?: CylinderOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Shape.defaults,
    diameter: 1,
    length: 1,
    frontFace: undefined,
    fill: true
  };

  static optionKeys: string[] = getOptionKeys(Shape.optionKeys, this.defaults);

  declare diameter: number;
  declare length: number;
  declare frontFace: boolean | string | undefined;
  declare group: CylinderGroup;
  declare frontBase: Ellipse;
  declare rearBase: Ellipse;

  create(options: CylinderOptions): void {
    // call super
    super.create(options);
    // composite shape, create child shapes
    // CylinderGroup to render cylinder surface then bases
    this.group = new CylinderGroup({
      addTo: this,
      color: this.color,
      visible: this.visible
    });
    const baseZ = this.length / 2;
    const baseColor = this.backface || true;
    // front outside base
    this.frontBase = this.group.frontBase = new Ellipse({
      addTo: this.group,
      diameter: this.diameter,
      translate: { z: baseZ },
      rotate: { y: TAU / 2 },
      color: this.color,
      stroke: this.stroke,
      fill: this.fill,
      backface: this.frontFace || baseColor,
      visible: this.visible
    });
    // back outside base
    this.rearBase = this.group.rearBase = this.frontBase.copy({
      translate: { z: -baseZ },
      rotate: { y: 0 },
      backface: baseColor
    });
  }

  // Cylinder shape does not render anything
  render(): void {}
}

// ----- set child properties ----- //

const childProperties = ["stroke", "fill", "color", "visible"] as const;
childProperties.forEach((property) => {
  // use proxy property for custom getter & setter
  const _prop = "_" + property;
  Object.defineProperty(Cylinder.prototype, property, {
    get(this: Cylinder) {
      return (this as unknown as Record<string, unknown>)[_prop];
    },
    set(this: Cylinder, value: unknown) {
      (this as unknown as Record<string, unknown>)[_prop] = value;
      // set property on children
      if (this.frontBase) {
        for (const child of [this.frontBase, this.rearBase, this.group]) {
          (child as unknown as Record<string, unknown>)[property] = value;
        }
      }
    }
  });
});

// TODO child property setter for backface, frontBaseColor, & rearBaseColor
