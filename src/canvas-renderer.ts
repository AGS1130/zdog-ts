import type { Renderer } from "./renderer";

export const CanvasRenderer: Renderer<CanvasRenderingContext2D> = {
  isCanvas: true,

  begin(ctx) {
    ctx.beginPath();
  },

  move(ctx, _elem, point) {
    ctx.moveTo(point.x, point.y);
  },

  line(ctx, elem, point) {
    ctx.lineTo(point.x, point.y);
  },

  bezier(ctx, _elem, cp0, cp1, end) {
    ctx.bezierCurveTo(cp0.x, cp0.y, cp1.x, cp1.y, end.x, end.y);
  },

  closePath(ctx) {
    ctx.closePath();
  },

  setPath() {},

  renderPath(ctx, elem, pathCommands, isClosed) {
    this.begin(ctx, elem);
    pathCommands.forEach((command) => {
      command.render(ctx, elem, CanvasRenderer);
    });
    if (isClosed) {
      this.closePath(ctx, elem);
    }
  },

  stroke(ctx, _elem, isStroke, color, lineWidth) {
    if (!isStroke) {
      return;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  },

  fill(ctx, _elem, isFill, color) {
    if (!isFill) {
      return;
    }
    ctx.fillStyle = color;
    ctx.fill();
  },

  end() {}
};
