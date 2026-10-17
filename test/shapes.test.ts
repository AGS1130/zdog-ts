import { describe, expect, test } from "bun:test";
import * as Z from "../src";
import { type Call, createRecordingContext } from "./recording-context";

function renderCanvas(item: InstanceType<typeof Z.Anchor>): Call[] {
  const calls: Call[] = [];
  item.updateGraph();
  item.renderGraphCanvas(createRecordingContext(calls));
  return calls;
}

function renderSvg(item: InstanceType<typeof Z.Anchor>): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  item.updateGraph();
  item.renderGraphSvg(svg);
  return svg;
}

describe("Anchor", () => {
  test("applies defaults & options, ignores unknown options", () => {
    const anchor = new Z.Anchor({ translate: { x: 2 }, scale: 3, foo: 1 } as never);
    expect(anchor.translate).toMatchObject({ x: 2, y: 0, z: 0 });
    expect(anchor.scale).toMatchObject({ x: 3, y: 3, z: 3 });
    expect("foo" in anchor).toBe(false);
  });

  test("addTo, addChild & remove", () => {
    const parent = new Z.Anchor();
    const child = new Z.Anchor({ addTo: parent });
    expect(parent.children).toEqual([child]);
    const other = new Z.Anchor();
    other.addChild(child);
    expect(parent.children).toEqual([]);
    expect(child.addTo).toBe(other);
    child.remove();
    expect(other.children).toEqual([]);
  });

  test("copyGraph clones children", () => {
    const parent = new Z.Anchor({ rotate: { y: 1 } });
    new Z.Shape({ addTo: parent, color: "red" });
    const clone = parent.copyGraph({ translate: { x: 1 } });
    expect(clone).toBeInstanceOf(Z.Anchor);
    expect(clone.rotate.y).toBe(1);
    expect(clone.translate.x).toBe(1);
    expect(clone.children).toHaveLength(1);
    expect((clone.children[0] as InstanceType<typeof Z.Shape>).color).toBe("red");
  });

  test("normalizeRotate", () => {
    const anchor = new Z.Anchor({ rotate: { x: -1, y: Z.TAU + 1 } });
    anchor.normalizeRotate();
    expect(anchor.rotate.x).toBeCloseTo(Z.TAU - 1);
    expect(anchor.rotate.y).toBeCloseTo(1);
  });

  test("renderGraph requires a target", () => {
    const anchor = new Z.Anchor();
    expect(() => anchor.renderGraphCanvas(undefined as never)).toThrow("Canvas context required");
    expect(() => anchor.renderGraphSvg(undefined as never)).toThrow("SVG required");
  });

  test("subclass inherits defaults & adds option keys", () => {
    const Star = Z.Shape.subclass({ points: 5 });
    const star = new Star({ points: 4 } as never) as InstanceType<typeof Z.Shape> & { points: number };
    expect(star).toBeInstanceOf(Z.Shape);
    expect(star.points).toBe(4);
    expect(star.color).toBe("#333");
    expect(Star.optionKeys).toContain("points");
    expect(Z.Shape.optionKeys).not.toContain("points");
  });
});

describe("Shape", () => {
  test("parses path instructions into commands", () => {
    const shape = new Z.Shape({
      path: [{ x: -1 }, { arc: [{ x: 1 }, { y: 1 }] }, { bezier: [{}, {}, { z: 1 }] }, { move: { x: 2 } }, { y: 3 }]
    });
    expect(shape.pathCommands.map((command) => command.method)).toEqual(["move", "arc", "bezier", "move", "line"]);
    expect(shape.pathCommands[1].previousPoint).toBe(shape.pathCommands[0].endRenderPoint);
  });

  test("renders a path to canvas", () => {
    const shape = new Z.Shape({ path: [{ x: -1 }, { x: 1 }, { y: 1 }], stroke: 2, fill: true, color: "red" });
    const calls = renderCanvas(shape);
    expect(calls.map(([name]) => name)).toEqual([
      "beginPath",
      "moveTo",
      "lineTo",
      "lineTo",
      "closePath",
      "strokeStyle=",
      "lineWidth=",
      "stroke",
      "fillStyle=",
      "fill"
    ]);
  });

  test("renders a single point as a canvas dot", () => {
    const calls = renderCanvas(new Z.Shape({ stroke: 4 }));
    expect(calls).toContainEqual(["arc", 0, 0, 2, 0, Z.TAU]);
    expect(renderCanvas(new Z.Shape({ stroke: false }))).toEqual([]);
  });

  test("hides backface & uses backface color", () => {
    const rect = new Z.Rect({ rotate: { y: Z.TAU / 2 }, backface: false });
    expect(renderCanvas(rect)).toEqual([]);
    rect.backface = "blue";
    expect(renderCanvas(rect)).toContainEqual(["strokeStyle=", "blue"]);
  });

  test("renders svg path elements", () => {
    const svg = renderSvg(new Z.Rect({ width: 2, height: 2, stroke: 1, color: "red" }));
    expect(svg.children).toHaveLength(1);
    const path = svg.children[0];
    expect(path.nodeName).toBe("path");
    expect(path.getAttribute("d")).toBe("M-1,-1 L1,-1 L1,1 L-1,1 Z");
    expect(path.getAttribute("stroke")).toBe("red");
    expect(path.getAttribute("stroke-width")).toBe("1");
    expect(path.getAttribute("fill")).toBe("none");
    expect(path.getAttribute("stroke-linecap")).toBe("round");
  });

  test("line between two points is not closed", () => {
    const svg = renderSvg(new Z.Shape({ path: [{ x: -1 }, { x: 1.23456 }] }));
    expect(svg.children[0].getAttribute("d")).toBe("M-1,0 L1.235,0 ");
  });

  test("invisible shapes do not render", () => {
    expect(renderCanvas(new Z.Shape({ visible: false }))).toEqual([]);
  });
});

describe("path shapes", () => {
  test("Rect, RoundedRect, Ellipse & Polygon paths", () => {
    expect(new Z.Rect({ width: 2, height: 4 }).path).toHaveLength(4);
    expect(new Z.RoundedRect({ width: 4, height: 2, cornerRadius: 0.5 }).path).toHaveLength(9);
    expect(new Z.RoundedRect({ width: 2, height: 2, cornerRadius: 1 }).path).toHaveLength(5);
    expect(new Z.Ellipse({ diameter: 2 }).path).toHaveLength(5);
    expect(new Z.Ellipse({ width: 2, height: 1, quarters: 2 }).path).toHaveLength(3);
    const polygon = new Z.Polygon({ sides: 4, radius: 1 });
    expect(polygon.path).toHaveLength(4);
    expect((polygon.path[0] as { y: number }).y).toBeCloseTo(-1);
  });
});

describe("Group", () => {
  test("renders children in its own flat graph", () => {
    const parent = new Z.Anchor();
    const group = new Z.Group({ addTo: parent, updateSort: true });
    new Z.Shape({ addTo: group, translate: { z: 1 } });
    new Z.Shape({ addTo: group, translate: { z: -1 } });
    expect(parent.getFlatGraph()).toEqual([parent, group]);
    const calls = renderCanvas(parent);
    expect(calls.filter(([name]) => name == "arc")).toHaveLength(2);
    expect(group.sortValue).toBe(0);
    group.visible = false;
    expect(renderCanvas(parent)).toEqual([]);
  });
});

describe("composite shapes", () => {
  test("Hemisphere renders dome & base", () => {
    const hemisphere = new Z.Hemisphere({ diameter: 2, rotate: { x: 1 } });
    expect(renderCanvas(hemisphere).filter(([name]) => name == "fill")).toHaveLength(2);
    const svg = renderSvg(hemisphere);
    expect(svg.children).toHaveLength(2);
    expect(svg.children[0].getAttribute("d")).toStartWith("M -");
    expect(svg.children[0].getAttribute("transform")).toStartWith("translate(");
  });

  test("Cone renders surface when apex is visible", () => {
    const cone = new Z.Cone({ diameter: 2, length: 2, rotate: { x: 1 } });
    expect(renderSvg(cone).children).toHaveLength(2);
    expect(renderCanvas(new Z.Cone({ diameter: 2, length: 2 })).filter(([name]) => name == "fill")).toHaveLength(1);
  });

  test("Cylinder renders surface & bases, forwards properties", () => {
    const cylinder = new Z.Cylinder({ diameter: 2, length: 2, frontFace: "pink", rotate: { y: 1 } });
    expect(renderCanvas(cylinder)).toContainEqual(["lineCap=", "butt"]);
    expect(renderSvg(cylinder).children).toHaveLength(3);
    cylinder.color = "red";
    expect(cylinder.frontBase.color).toBe("red");
    expect(cylinder.rearBase.color).toBe("red");
    expect(cylinder.group.color).toBe("red");
    expect(cylinder.frontBase.backface).toBe("pink");
  });

  test("Cylinder copyGraph does not duplicate children", () => {
    const parent = new Z.Anchor();
    new Z.Cylinder({ addTo: parent });
    const clone = parent.copyGraph();
    const cylinder = clone.children[0] as InstanceType<typeof Z.Cylinder>;
    expect(cylinder.children).toHaveLength(1);
    expect(cylinder.group.children).toHaveLength(2);
  });

  test("Box faces", () => {
    const box = new Z.Box({ width: 2, height: 3, depth: 4, leftFace: "red", topFace: false });
    expect(box.children).toHaveLength(5);
    expect(box.leftFaceRect?.color).toBe("red");
    expect(box.frontFaceRect?.width).toBe(2);
    expect(box.leftFaceRect?.width).toBe(4);
    box.color = "blue";
    expect(box.frontFaceRect?.color).toBe("blue");
    expect(box.leftFaceRect?.color).toBe("red");
    box.leftFace = false;
    expect(box.children).toHaveLength(4);
    box.topFace = "green";
    expect(box.topFaceRect?.color).toBe("green");
    expect(box.copyGraph().children).toHaveLength(5);
    expect(renderCanvas(box).filter(([name]) => name == "fill").length).toBeGreaterThan(0);
  });
});

describe("types", () => {
  test("constructor & copy options are type checked", () => {
    // @ts-expect-error unknown option
    new Z.Shape({ colr: "red" });
    // @ts-expect-error wrong option type
    new Z.Rect({ width: "2" });
    const rect: InstanceType<typeof Z.Rect> = new Z.Rect({ width: 2 }).copy({ color: "red" });
    // @ts-expect-error wrong anchor option type
    rect.copy({ translate: 1 });
    expect(rect.color).toBe("red");
  });
});
