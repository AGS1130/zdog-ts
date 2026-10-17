import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import * as Z from "../src";
import { type Call, createRecordingContext } from "./recording-context";

const svgURI = "http://www.w3.org/2000/svg";

// happy-dom does not derive pageX & pageY, set them on the event
function withPage<E extends Event>(event: E, pageX: number, pageY: number): E {
  Object.defineProperties(event, { pageX: { value: pageX }, pageY: { value: pageY } });
  return event;
}

function createCanvas(calls: Call[] = []): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  spyOn(canvas, "getContext").mockReturnValue(createRecordingContext(calls) as never);
  return canvas;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Illustration", () => {
  test("requires an element", () => {
    expect(() => new Z.Illustration({ element: ".missing" })).toThrow("element required");
  });

  test("queries element by selector", () => {
    const canvas = createCanvas();
    canvas.className = "zdog-canvas";
    document.body.appendChild(canvas);
    const illo = new Z.Illustration({ element: ".zdog-canvas" });
    expect(illo.element).toBe(canvas);
    expect(illo.isCanvas).toBe(true);
  });

  test("canvas setup & render", () => {
    const calls: Call[] = [];
    const canvas = createCanvas(calls);
    canvas.width = 300;
    canvas.height = 200;
    const onPrerender = mock();
    const illo = new Z.Illustration({ element: canvas, zoom: 2, onPrerender });
    expect([illo.width, illo.height, canvas.width, canvas.height]).toEqual([300, 200, 300, 200]);
    new Z.Shape({ addTo: illo, stroke: 2 });
    illo.updateRenderGraph();
    expect(onPrerender).toHaveBeenCalledTimes(1);
    expect(calls).toContainEqual(["translate", 150, 100]);
    expect(calls).toContainEqual(["scale", 2, 2]);
    expect(calls).toContainEqual(["arc", 0, 0, 1, 0, Z.TAU]);
    expect(calls.at(-1)).toEqual(["restore"]);
  });

  test("canvas up-rez for hi-DPI devices", () => {
    Object.defineProperty(window, "devicePixelRatio", { value: 2, configurable: true });
    try {
      const canvas = createCanvas();
      canvas.width = 300;
      canvas.height = 200;
      new Z.Illustration({ element: canvas });
      expect([canvas.width, canvas.height]).toEqual([600, 400]);
      expect([canvas.style.width, canvas.style.height]).toEqual(["300px", "200px"]);
    } finally {
      delete (window as { devicePixelRatio?: number }).devicePixelRatio;
    }
  });

  test("svg setup & render", () => {
    const svg = document.createElementNS(svgURI, "svg");
    svg.setAttribute("width", "240");
    svg.setAttribute("height", "120");
    const illo = new Z.Illustration({ element: svg, zoom: 2 });
    expect(illo.isSvg).toBe(true);
    expect(svg.getAttribute("viewBox")).toBe("-60 -30 120 60");
    new Z.Rect({ addTo: illo });
    illo.updateRenderGraph();
    illo.updateRenderGraph();
    expect(svg.children).toHaveLength(1);
    expect(svg.children[0].getAttribute("d")).toBe("M-0.5,-0.5 L0.5,-0.5 L0.5,0.5 L-0.5,0.5 Z");
  });

  test("resize", () => {
    const svg = document.createElementNS(svgURI, "svg");
    spyOn(svg, "getBoundingClientRect").mockReturnValue({ width: 320, height: 240 } as DOMRect);
    const onResize = mock();
    const illo = new Z.Illustration({ element: svg, resize: true, onResize });
    expect(onResize).toHaveBeenCalledWith(320, 240);
    expect(svg.hasAttribute("width")).toBe(false);

    illo.resize = "fullscreen";
    window.dispatchEvent(new Event("resize"));
    expect(onResize).toHaveBeenLastCalledWith(window.innerWidth, window.innerHeight);

    illo.setResize(false);
    window.dispatchEvent(new Event("resize"));
    expect(onResize).toHaveBeenCalledTimes(2);
  });

  test("dragRotate rotates on drag", () => {
    const canvas = createCanvas();
    canvas.width = 100;
    canvas.height = 100;
    const onDragStart = mock();
    const onDragMove = mock();
    const onDragEnd = mock();
    const illo = new Z.Illustration({ element: canvas, dragRotate: true, onDragStart, onDragMove, onDragEnd });
    expect(canvas.style.touchAction).toBe("none");

    canvas.dispatchEvent(withPage(new PointerEvent("pointerdown"), 10, 10));
    window.dispatchEvent(withPage(new PointerEvent("pointermove"), 35, 10));
    expect(onDragStart).toHaveBeenCalled();
    expect(onDragMove).toHaveBeenCalledWith(expect.anything(), 25, 0);
    expect(illo.rotate.y).toBeCloseTo(-Z.TAU / 4);

    window.dispatchEvent(new PointerEvent("pointerup"));
    expect(onDragEnd).toHaveBeenCalledTimes(1);
    // move & up listeners are removed after drag end
    window.dispatchEvent(withPage(new PointerEvent("pointermove"), 60, 10));
    expect(onDragMove).toHaveBeenCalledTimes(1);
  });

  test("dragRotate can target another item", () => {
    const anchor = new Z.Anchor();
    const illo = new Z.Illustration({ element: createCanvas(), dragRotate: anchor });
    expect(illo.dragRotate).toBe(anchor);
  });
});

describe("Dragger", () => {
  test("binds to startElement", () => {
    const element = document.createElement("div");
    const onDragStart = mock();
    new Z.Dragger({ startElement: element, onDragStart });
    element.dispatchEvent(withPage(new PointerEvent("pointerdown"), 1, 2));
    expect(onDragStart).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new PointerEvent("pointerup"));
  });

  test("touch & mouse events", () => {
    const element = document.createElement("div");
    const onDragMove = mock();
    const dragger = new Z.Dragger({ startElement: element, onDragMove });
    const touch = (type: string, pageX: number, pageY: number) =>
      new TouchEvent(type, { changedTouches: [new Touch({ identifier: 0, target: element, pageX, pageY })] });

    dragger.handleEvent(touch("touchstart", 0, 0));
    dragger.handleEvent(touch("touchmove", 3, 4));
    expect(onDragMove).toHaveBeenLastCalledWith(expect.objectContaining({ pageX: 3, pageY: 4 }), 3, 4);
    dragger.handleEvent(new TouchEvent("touchend"));

    dragger.handleEvent(withPage(new MouseEvent("mousedown"), 5, 0));
    dragger.handleEvent(withPage(new MouseEvent("mousemove"), 7, 0));
    expect(onDragMove).toHaveBeenLastCalledWith(expect.anything(), 2, 0);
    dragger.handleEvent(new MouseEvent("mouseup"));
    // unhandled event types are ignored
    dragger.handleEvent(new Event("unknown"));
  });
});
