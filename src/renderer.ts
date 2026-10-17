import type { PathCommand } from "./path-command";
import type { Vector } from "./vector";

export type RenderContext = CanvasRenderingContext2D | SVGElement;

// canvas renderers have no element, svg renderers draw into a <path>
export type RenderElement = SVGPathElement | undefined;

export interface Renderer<Ctx extends RenderContext = RenderContext> {
  readonly isCanvas?: boolean;
  readonly isSvg?: boolean;
  begin(ctx: Ctx, elem: RenderElement): void;
  move(ctx: Ctx, elem: RenderElement, point: Vector): string | void;
  line(ctx: Ctx, elem: RenderElement, point: Vector): string | void;
  bezier(ctx: Ctx, elem: RenderElement, cp0: Vector, cp1: Vector, end: Vector): string | void;
  closePath(ctx: Ctx, elem: RenderElement): string | void;
  setPath(ctx: Ctx, elem: RenderElement, pathValue: string): void;
  renderPath(ctx: Ctx, elem: RenderElement, pathCommands: PathCommand[], isClosed?: boolean): void;
  stroke(ctx: Ctx, elem: RenderElement, isStroke: number | boolean, color: string, lineWidth: number): void;
  fill(ctx: Ctx, elem: RenderElement, isFill: boolean, color: string): void;
  end(ctx: Ctx, elem: RenderElement): void;
}
