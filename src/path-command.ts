import type { RenderContext, RenderElement, Renderer } from "./renderer";
import { Vector, type VectorOptions } from "./vector";

export type PathMethod = "move" | "line" | "bezier" | "arc";

const arcHandleLength = 9 / 16;

export class PathCommand {
  method: PathMethod;
  points: Vector[];
  renderPoints: Vector[];
  previousPoint: Vector | undefined;
  endRenderPoint: Vector;
  controlPoints: [Vector, Vector] | undefined;

  constructor(method: PathMethod, points: VectorOptions[], previousPoint?: Vector) {
    this.method = method;
    this.points = points.map(mapVectorPoint);
    this.renderPoints = points.map(mapNewVector);
    this.previousPoint = previousPoint;
    this.endRenderPoint = this.renderPoints[this.renderPoints.length - 1];
    // arc actions come with previous point & corner point
    // but require bezier control points
    if (method == "arc") {
      this.controlPoints = [new Vector(), new Vector()];
    }
  }

  reset(): void {
    // reset renderPoints back to orignal points position
    const points = this.points;
    this.renderPoints.forEach((renderPoint, i) => {
      const point = points[i];
      renderPoint.set(point);
    });
  }

  transform(translation: VectorOptions, rotation: VectorOptions, scale: number | VectorOptions): void {
    this.renderPoints.forEach((renderPoint) => {
      renderPoint.transform(translation, rotation, scale);
    });
  }

  render(ctx: RenderContext, elem: RenderElement, renderer: Renderer): string | void {
    return this[this.method](ctx, elem, renderer);
  }

  move(ctx: RenderContext, elem: RenderElement, renderer: Renderer): string | void {
    return renderer.move(ctx, elem, this.renderPoints[0]);
  }

  line(ctx: RenderContext, elem: RenderElement, renderer: Renderer): string | void {
    return renderer.line(ctx, elem, this.renderPoints[0]);
  }

  bezier(ctx: RenderContext, elem: RenderElement, renderer: Renderer): string | void {
    const cp0 = this.renderPoints[0];
    const cp1 = this.renderPoints[1];
    const end = this.renderPoints[2];
    return renderer.bezier(ctx, elem, cp0, cp1, end);
  }

  arc(ctx: RenderContext, elem: RenderElement, renderer: Renderer): string | void {
    const prev = this.previousPoint;
    const corner = this.renderPoints[0];
    const end = this.renderPoints[1];
    const [cp0, cp1] = this.controlPoints!;
    cp0.set(prev).lerp(corner, arcHandleLength);
    cp1.set(end).lerp(corner, arcHandleLength);
    return renderer.bezier(ctx, elem, cp0, cp1, end);
  }
}

function mapVectorPoint(point: VectorOptions): Vector {
  if (point instanceof Vector) {
    return point;
  } else {
    return new Vector(point);
  }
}

function mapNewVector(point: VectorOptions): Vector {
  return new Vector(point);
}
