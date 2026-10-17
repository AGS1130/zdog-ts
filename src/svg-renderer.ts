import type { Renderer } from "./renderer";
import type { Vector } from "./vector";

// round path coordinates to 3 decimals
function round(num: number): number {
  return Math.round(num * 1000) / 1000;
}

function getPointString(point: Vector): string {
  return round(point.x) + "," + round(point.y) + " ";
}

// svg renderers always render into an element
export const SvgRenderer: Renderer<SVGElement> & { round: typeof round } = {
  isSvg: true,

  round,

  begin() {},

  move(svg, elem, point) {
    return "M" + getPointString(point);
  },

  line(svg, elem, point) {
    return "L" + getPointString(point);
  },

  bezier(svg, elem, cp0, cp1, end) {
    return "C" + getPointString(cp0) + getPointString(cp1) + getPointString(end);
  },

  closePath(/* elem */) {
    return "Z";
  },

  setPath(svg, elem: SVGPathElement, pathValue) {
    elem.setAttribute("d", pathValue);
  },

  renderPath(svg, elem, pathCommands, isClosed) {
    let pathValue = "";
    pathCommands.forEach((command) => {
      pathValue += command.render(svg, elem, SvgRenderer);
    });
    if (isClosed) {
      pathValue += this.closePath(svg, elem);
    }
    this.setPath(svg, elem, pathValue);
  },

  stroke(svg, elem: SVGPathElement, isStroke, color, lineWidth) {
    if (!isStroke) {
      return;
    }
    elem.setAttribute("stroke", color);
    elem.setAttribute("stroke-width", String(lineWidth));
  },

  fill(svg, elem: SVGPathElement, isFill, color) {
    const fillColor = isFill ? color : "none";
    elem.setAttribute("fill", fillColor);
  },

  end(svg, elem: SVGPathElement) {
    svg.appendChild(elem);
  }
};
