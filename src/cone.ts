import { Anchor, type Defaults, getOptionKeys } from "./anchor";
import { TAU } from "./boilerplate";
import { Ellipse, type EllipseOptions } from "./ellipse";
import { PathCommand } from "./path-command";
import type { RenderContext, RenderElement, Renderer } from "./renderer";
import { Vector, type VectorOptions } from "./vector";

export interface ConeOptions extends EllipseOptions {
  length?: number;
}

const svgURI = "http://www.w3.org/2000/svg";

export class Cone extends Ellipse {
  constructor(options?: ConeOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Ellipse.defaults,
    length: 1,
    fill: true
  };

  static optionKeys: string[] = getOptionKeys(Ellipse.optionKeys, this.defaults);

  declare length: number;
  declare apex: Anchor;
  declare renderApex: Vector;
  declare renderCentroid: Vector;
  declare tangentA: Vector;
  declare tangentB: Vector;
  declare surfacePathCommands: PathCommand[];
  declare surfaceSvgElement: SVGPathElement | undefined;

  create(options: ConeOptions): void {
    // call super
    super.create(options);
    // composite shape, create child shapes
    this.apex = new Anchor({
      addTo: this,
      translate: { z: this.length }
    });

    // vectors used for calculation
    this.renderApex = new Vector();
    this.renderCentroid = new Vector();
    this.tangentA = new Vector();
    this.tangentB = new Vector();

    this.surfacePathCommands = [
      new PathCommand("move", [{}]), // points set in renderConeSurface
      new PathCommand("line", [{}]),
      new PathCommand("line", [{}])
    ];
  }

  updateSortValue(): void {
    // center of cone is one third of its length
    this.renderCentroid.set(this.renderOrigin).lerp(this.apex.renderOrigin, 1 / 3);
    this.sortValue = this.renderCentroid.z;
  }

  render(ctx: RenderContext, renderer: Renderer): void {
    this.renderConeSurface(ctx, renderer);
    super.render(ctx, renderer);
  }

  renderConeSurface(ctx: RenderContext, renderer: Renderer): void {
    if (!this.visible) {
      return;
    }
    this.renderApex.set(this.apex.renderOrigin).subtract(this.renderOrigin);

    const scale = this.renderNormal.magnitude();
    const apexDistance = this.renderApex.magnitude2d();
    const normalDistance = this.renderNormal.magnitude2d();
    // eccentricity
    const eccenAngle = Math.acos(normalDistance / scale);
    const eccen = Math.sin(eccenAngle);
    const radius = (this.diameter / 2) * scale;
    // does apex extend beyond eclipse of face
    const isApexVisible = radius * eccen < apexDistance;
    if (!isApexVisible) {
      return;
    }
    // update tangents
    const apexAngle = Math.atan2(this.renderNormal.y, this.renderNormal.x) + TAU / 2;
    const projectLength = apexDistance / eccen;
    const projectAngle = Math.acos(radius / projectLength);
    // set tangent points
    const tangentA = this.tangentA;
    const tangentB = this.tangentB;

    tangentA.x = Math.cos(projectAngle) * radius * eccen;
    tangentA.y = Math.sin(projectAngle) * radius;

    tangentB.set(this.tangentA);
    tangentB.y *= -1;

    tangentA.rotateZ(apexAngle);
    tangentB.rotateZ(apexAngle);
    tangentA.add(this.renderOrigin);
    tangentB.add(this.renderOrigin);

    this.setSurfaceRenderPoint(0, tangentA);
    this.setSurfaceRenderPoint(1, this.apex.renderOrigin);
    this.setSurfaceRenderPoint(2, tangentB);

    // render
    const elem = this.getSurfaceRenderElement(ctx, renderer);
    renderer.renderPath(ctx, elem, this.surfacePathCommands);
    renderer.stroke(ctx, elem, this.stroke, this.color, this.getLineWidth());
    renderer.fill(ctx, elem, this.fill, this.color);
    renderer.end(ctx, elem);
  }

  getSurfaceRenderElement(_ctx: RenderContext, renderer: Renderer): RenderElement {
    if (!renderer.isSvg) {
      return;
    }
    if (!this.surfaceSvgElement) {
      // create svgElement
      this.surfaceSvgElement = document.createElementNS(svgURI, "path");
      this.surfaceSvgElement.setAttribute("stroke-linecap", "round");
      this.surfaceSvgElement.setAttribute("stroke-linejoin", "round");
    }
    return this.surfaceSvgElement;
  }

  setSurfaceRenderPoint(index: number, point: VectorOptions): void {
    const renderPoint = this.surfacePathCommands[index].renderPoints[0];
    renderPoint.set(point);
  }
}
