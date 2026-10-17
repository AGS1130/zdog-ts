import { Anchor, type Defaults, getOptionKeys } from "./anchor";
import { TAU } from "./boilerplate";
import { Ellipse, type EllipseOptions } from "./ellipse";
import type { RenderContext, RenderElement, Renderer } from "./renderer";
import { Vector } from "./vector";

export interface HemisphereOptions extends EllipseOptions {}

const svgURI = "http://www.w3.org/2000/svg";

export class Hemisphere extends Ellipse {
  constructor(options?: HemisphereOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Ellipse.defaults,
    fill: true
  };

  static optionKeys: string[] = getOptionKeys(Ellipse.optionKeys, this.defaults);

  declare apex: Anchor;
  declare renderCentroid: Vector;
  declare domeSvgElement: SVGPathElement | undefined;

  create(options: HemisphereOptions): void {
    // call super
    super.create(options);
    // composite shape, create child shapes
    this.apex = new Anchor({
      addTo: this,
      translate: { z: this.diameter / 2 }
    });
    // vector used for calculation
    this.renderCentroid = new Vector();
  }

  updateSortValue(): void {
    // centroid of hemisphere is 3/8 between origin and apex
    this.renderCentroid.set(this.renderOrigin).lerp(this.apex.renderOrigin, 3 / 8);
    this.sortValue = this.renderCentroid.z;
  }

  render(ctx: RenderContext, renderer: Renderer): void {
    this.renderDome(ctx, renderer);
    // call super
    super.render(ctx, renderer);
  }

  renderDome(ctx: RenderContext, renderer: Renderer): void {
    if (!this.visible) {
      return;
    }
    const elem = this.getDomeRenderElement(ctx, renderer);
    let contourAngle = Math.atan2(this.renderNormal.y, this.renderNormal.x);
    const domeRadius = (this.diameter / 2) * this.renderNormal.magnitude();
    const x = this.renderOrigin.x;
    const y = this.renderOrigin.y;

    if (renderer.isCanvas) {
      // canvas
      const startAngle = contourAngle + TAU / 4;
      const endAngle = contourAngle - TAU / 4;
      const canvas = ctx as CanvasRenderingContext2D;
      canvas.beginPath();
      canvas.arc(x, y, domeRadius, startAngle, endAngle);
    } else if (renderer.isSvg && elem) {
      // svg
      contourAngle = ((contourAngle - TAU / 4) / TAU) * 360;
      elem.setAttribute(
        "d",
        "M " + -domeRadius + ",0 A " + domeRadius + "," + domeRadius + " 0 0 1 " + domeRadius + ",0"
      );
      elem.setAttribute("transform", "translate(" + x + "," + y + " ) rotate(" + contourAngle + ")");
    }

    renderer.stroke(ctx, elem, this.stroke, this.color, this.getLineWidth());
    renderer.fill(ctx, elem, this.fill, this.color);
    renderer.end(ctx, elem);
  }

  getDomeRenderElement(_ctx: RenderContext, renderer: Renderer): RenderElement {
    if (!renderer.isSvg) {
      return;
    }
    if (!this.domeSvgElement) {
      // create svgElement
      this.domeSvgElement = document.createElementNS(svgURI, "path");
      this.domeSvgElement.setAttribute("stroke-linecap", "round");
      this.domeSvgElement.setAttribute("stroke-linejoin", "round");
    }
    return this.domeSvgElement;
  }
}
