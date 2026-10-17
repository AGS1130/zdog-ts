import { Anchor, getOptionKeys } from "./anchor";
import type { AnchorOptions, Defaults } from "./anchor";
import { TAU } from "./boilerplate";
import { PathCommand, type PathMethod } from "./path-command";
import type { RenderContext, RenderElement, Renderer } from "./renderer";
import { Vector, type VectorOptions } from "./vector";

// pathPart can be just vector coordinates -> { x, y, z }
// or path instruction -> { arc: [ {x0,y0,z0}, {x1,y1,z1} ] }
export type PathPart =
  | VectorOptions
  | { move: VectorOptions | VectorOptions[] }
  | { line: VectorOptions | VectorOptions[] }
  | { bezier: VectorOptions[] }
  | { arc: VectorOptions[] };

export interface ShapeOptions extends AnchorOptions {
  stroke?: number | boolean;
  fill?: boolean;
  color?: string;
  closed?: boolean;
  visible?: boolean;
  path?: PathPart[];
  front?: VectorOptions;
  backface?: boolean | string;
}

const actionNames: string[] = ["move", "line", "bezier", "arc"];

const svgURI = "http://www.w3.org/2000/svg";

export class Shape extends Anchor {
  constructor(options?: ShapeOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Anchor.defaults,
    stroke: 1,
    fill: false,
    color: "#333",
    closed: true,
    visible: true,
    path: [{}],
    front: { z: 1 },
    backface: true
  };

  static optionKeys: string[] = getOptionKeys(Anchor.optionKeys, this.defaults);

  declare stroke: number | boolean;
  declare fill: boolean;
  declare color: string;
  declare closed: boolean;
  declare visible: boolean;
  declare path: PathPart[];
  declare front: Vector;
  declare backface: boolean | string;
  declare renderFront: Vector;
  declare renderNormal: Vector;
  declare pathCommands: PathCommand[];
  declare isFacingBack: boolean;
  declare svgElement: SVGPathElement | undefined;

  create(options: ShapeOptions): void {
    super.create(options);
    this.updatePath();
    // front
    this.front = new Vector(options.front || this.front);
    this.renderFront = new Vector(this.front);
    this.renderNormal = new Vector();
  }

  updatePath(): void {
    this.setPath();
    this.updatePathCommands();
  }

  // place holder for Ellipse, Rect, etc.
  setPath(): void {}

  // parse path into PathCommands
  updatePathCommands(): void {
    let previousPoint: Vector | undefined;
    this.pathCommands = this.path.map((pathPart, i) => {
      const keys = Object.keys(pathPart);
      let method = keys[0];
      let points = (pathPart as Record<string, unknown>)[method];
      // default to line if no instruction
      const isInstruction = keys.length == 1 && actionNames.includes(method);
      if (!isInstruction) {
        method = "line";
        points = pathPart;
      }
      // munge single-point methods like line & move without arrays
      const isLineOrMove = method == "line" || method == "move";
      const isPointsArray = Array.isArray(points);
      if (isLineOrMove && !isPointsArray) {
        points = [points];
      }

      // first action is always move
      method = i === 0 ? "move" : method;
      // arcs require previous last point
      const command = new PathCommand(method as PathMethod, points as VectorOptions[], previousPoint);
      // update previousLastPoint
      previousPoint = command.endRenderPoint;
      return command;
    });
  }

  // ----- update ----- //

  reset(): void {
    this.renderOrigin.set(this.origin);
    this.renderFront.set(this.front);
    // reset command render points
    this.pathCommands.forEach((command) => {
      command.reset();
    });
  }

  transform(translation: Vector, rotation: Vector, scale: Vector): void {
    // calculate render points backface visibility & cone/hemisphere shapes
    this.renderOrigin.transform(translation, rotation, scale);
    this.renderFront.transform(translation, rotation, scale);
    this.renderNormal.set(this.renderOrigin).subtract(this.renderFront);
    // transform points
    this.pathCommands.forEach((command) => {
      command.transform(translation, rotation, scale);
    });
    // transform children
    this.children.forEach((child) => {
      child.transform(translation, rotation, scale);
    });
  }

  updateSortValue(): void {
    // sort by average z of all points
    // def not geometrically correct, but works for me
    let pointCount = this.pathCommands.length;
    const firstPoint = this.pathCommands[0].endRenderPoint;
    const lastPoint = this.pathCommands[pointCount - 1].endRenderPoint;
    // ignore the final point if self closing shape
    const isSelfClosing = pointCount > 2 && firstPoint.isSame(lastPoint);
    if (isSelfClosing) {
      pointCount -= 1;
    }

    let sortValueTotal = 0;
    for (let i = 0; i < pointCount; i++) {
      sortValueTotal += this.pathCommands[i].endRenderPoint.z;
    }
    this.sortValue = sortValueTotal / pointCount;
  }

  // ----- render ----- //

  render(ctx: RenderContext, renderer: Renderer): void {
    const length = this.pathCommands.length;
    if (!this.visible || !length) {
      return;
    }
    // do not render if hiding backface
    this.isFacingBack = this.renderNormal.z > 0;
    if (!this.backface && this.isFacingBack) {
      return;
    }
    if (!renderer) {
      throw new Error("Zdog renderer required. Set to " + renderer);
    }
    // render dot or path
    const isDot = length == 1;
    if (renderer.isCanvas && isDot) {
      this.renderCanvasDot(ctx as CanvasRenderingContext2D);
    } else {
      this.renderPath(ctx, renderer);
    }
  }

  // Safari does not render lines with no size, have to render circle instead
  renderCanvasDot(ctx: CanvasRenderingContext2D): void {
    const lineWidth = this.getLineWidth();
    if (!lineWidth) {
      return;
    }
    ctx.fillStyle = this.getRenderColor();
    const point = this.pathCommands[0].endRenderPoint;
    ctx.beginPath();
    const radius = lineWidth / 2;
    ctx.arc(point.x, point.y, radius, 0, TAU);
    ctx.fill();
  }

  getLineWidth(): number {
    if (!this.stroke) {
      return 0;
    }
    if (this.stroke === true) {
      return 1;
    }
    return this.stroke;
  }

  getRenderColor(): string {
    // use backface color if applicable
    const isBackfaceColor = typeof this.backface == "string" && this.isFacingBack;
    const color = isBackfaceColor ? (this.backface as string) : this.color;
    return color;
  }

  renderPath(ctx: RenderContext, renderer: Renderer): void {
    const elem = this.getRenderElement(ctx, renderer);
    const isTwoPoints = this.pathCommands.length == 2 && this.pathCommands[1].method == "line";
    const isClosed = !isTwoPoints && this.closed;
    const color = this.getRenderColor();

    renderer.renderPath(ctx, elem, this.pathCommands, isClosed);
    renderer.stroke(ctx, elem, this.stroke, color, this.getLineWidth());
    renderer.fill(ctx, elem, this.fill, color);
    renderer.end(ctx, elem);
  }

  getRenderElement(_ctx: RenderContext, renderer: Renderer): RenderElement {
    if (!renderer.isSvg) {
      return;
    }
    if (!this.svgElement) {
      // create svgElement
      this.svgElement = document.createElementNS(svgURI, "path");
      this.svgElement.setAttribute("stroke-linecap", "round");
      this.svgElement.setAttribute("stroke-linejoin", "round");
    }
    return this.svgElement;
  }
}
