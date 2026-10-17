import { Anchor, getOptionKeys } from "./anchor";
import type { AnchorOptions, Defaults } from "./anchor";
import { TAU } from "./boilerplate";
import { Dragger } from "./dragger";
import type { DragPointer, DraggerOptions } from "./dragger";

export type IllustrationElement = HTMLCanvasElement | SVGSVGElement;

export interface IllustrationOptions extends AnchorOptions, DraggerOptions {
  element: string | IllustrationElement;
  centered?: boolean;
  zoom?: number;
  dragRotate?: boolean | Anchor;
  resize?: boolean | "fullscreen";
  onPrerender?: (context: CanvasRenderingContext2D | SVGSVGElement) => void;
  onResize?: (width: number, height: number) => void;
}

function noop(): void {}

// Illustration mixes in Dragger's prototype methods, see below
// oxlint-disable-next-line no-unsafe-declaration-merging
export interface Illustration extends Omit<Dragger, "create" | "dragStart" | "dragMove"> {}

// oxlint-disable-next-line no-unsafe-declaration-merging
export class Illustration extends Anchor {
  static defaults: Defaults = {
    ...Anchor.defaults,
    element: undefined,
    centered: true,
    zoom: 1,
    dragRotate: false,
    resize: false,
    onPrerender: noop,
    onDragStart: noop,
    onDragMove: noop,
    onDragEnd: noop,
    onResize: noop
  };

  static optionKeys: string[] = getOptionKeys(Anchor.optionKeys, this.defaults);

  declare element: IllustrationElement;
  declare centered: boolean;
  declare zoom: number;
  declare dragRotate: boolean | Anchor;
  declare resize: boolean | "fullscreen";
  declare onPrerender: (context: CanvasRenderingContext2D | SVGSVGElement) => void;
  declare onResize: (width: number, height: number) => void;
  declare isCanvas: boolean | undefined;
  declare isSvg: boolean | undefined;
  declare ctx: CanvasRenderingContext2D;
  declare width: number;
  declare height: number;
  declare pixelRatio: number;
  declare canvasWidth: number;
  declare canvasHeight: number;
  declare resizeListener: (() => void) | undefined;
  declare dragStartRX: number;
  declare dragStartRY: number;

  constructor(options: IllustrationOptions) {
    super(options);
  }

  create(options: IllustrationOptions): void {
    super.create(options);
    Dragger.prototype.create.call(this, options);
    this.setElement(this.element);
    this.setDragRotate(this.dragRotate);
    this.setResize(this.resize);
  }

  setElement(element: string | IllustrationElement | null | undefined): void {
    const queryElement = this.getQueryElement(element);
    if (!queryElement) {
      throw new Error("Zdog.Illustration element required. Set to " + queryElement);
    }

    const nodeName = queryElement.nodeName.toLowerCase();
    if (nodeName == "canvas") {
      this.setCanvas(queryElement as HTMLCanvasElement);
    } else if (nodeName == "svg") {
      this.setSvg(queryElement as SVGSVGElement);
    }
  }

  setSize(width: number, height: number): void {
    width = Math.round(width);
    height = Math.round(height);
    if (this.isCanvas) {
      this.setSizeCanvas(width, height);
    } else if (this.isSvg) {
      this.setSizeSvg(width, height);
    }
  }

  setResize(resize: boolean | "fullscreen"): void {
    this.resize = resize;
    // create resize event listener
    if (!this.resizeListener) {
      this.resizeListener = this.onWindowResize.bind(this);
    }
    // add/remove event listener
    if (resize) {
      window.addEventListener("resize", this.resizeListener);
      this.onWindowResize();
    } else {
      window.removeEventListener("resize", this.resizeListener);
    }
  }

  // TODO debounce this?
  onWindowResize(): void {
    this.setMeasuredSize();
    this.onResize(this.width, this.height);
  }

  setMeasuredSize(): void {
    let width: number;
    let height: number;
    const isFullscreen = this.resize == "fullscreen";
    if (isFullscreen) {
      width = window.innerWidth;
      height = window.innerHeight;
    } else {
      const rect = this.element.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
    }
    this.setSize(width, height);
  }

  // ----- render ----- //

  renderGraph(item?: Anchor): void {
    if (this.isCanvas) {
      this.renderGraphCanvas(item);
    } else if (this.isSvg) {
      this.renderGraphSvg(item);
    }
  }

  // combo method
  updateRenderGraph(item?: Anchor): void {
    this.updateGraph();
    this.renderGraph(item);
  }

  // ----- canvas ----- //

  setCanvas(element: HTMLCanvasElement): void {
    this.element = element;
    this.isCanvas = true;
    // update related properties
    this.ctx = element.getContext("2d") as CanvasRenderingContext2D;
    // set initial size
    this.setSizeCanvas(element.width, element.height);
  }

  setSizeCanvas(width: number, height: number): void {
    this.width = width;
    this.height = height;
    // up-rez for hi-DPI devices
    const pixelRatio = (this.pixelRatio = window.devicePixelRatio || 1);
    const element = this.element as HTMLCanvasElement;
    element.width = this.canvasWidth = width * pixelRatio;
    element.height = this.canvasHeight = height * pixelRatio;
    const needsHighPixelRatioSizing = pixelRatio > 1 && !this.resize;
    if (needsHighPixelRatioSizing) {
      element.style.width = width + "px";
      element.style.height = height + "px";
    }
  }

  // Illustration renders a graph item into its own context,
  // the context parameter is only accepted for compatibility with Anchor
  renderGraphCanvas(item?: Anchor | CanvasRenderingContext2D): void {
    const graph = item instanceof Anchor ? item : this;
    this.prerenderCanvas();
    Anchor.prototype.renderGraphCanvas.call(graph, this.ctx);
    this.postrenderCanvas();
  }

  prerenderCanvas(): void {
    const ctx = this.ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.save();
    if (this.centered) {
      const centerX = (this.width / 2) * this.pixelRatio;
      const centerY = (this.height / 2) * this.pixelRatio;
      ctx.translate(centerX, centerY);
    }
    const scale = this.pixelRatio * this.zoom;
    ctx.scale(scale, scale);
    this.onPrerender(ctx);
  }

  postrenderCanvas(): void {
    this.ctx.restore();
  }

  // ----- svg ----- //

  setSvg(element: SVGSVGElement): void {
    this.element = element;
    this.isSvg = true;
    this.pixelRatio = 1;
    // set initial size from width & height attributes
    const width = element.getAttribute("width");
    const height = element.getAttribute("height");
    this.setSizeSvg(width, height);
  }

  // width & height may be raw attribute values when called from setSvg()
  setSizeSvg(width: number | string | null, height: number | string | null): void {
    this.width = Number(width);
    this.height = Number(height);
    const viewWidth = this.width / this.zoom;
    const viewHeight = this.height / this.zoom;
    const viewX = this.centered ? -viewWidth / 2 : 0;
    const viewY = this.centered ? -viewHeight / 2 : 0;
    this.element.setAttribute("viewBox", viewX + " " + viewY + " " + viewWidth + " " + viewHeight);
    if (this.resize) {
      // remove size attributes, let size be determined by viewbox
      this.element.removeAttribute("width");
      this.element.removeAttribute("height");
    } else {
      this.element.setAttribute("width", String(width));
      this.element.setAttribute("height", String(height));
    }
  }

  // Illustration renders a graph item into its own element,
  // the svg parameter is only accepted for compatibility with Anchor
  renderGraphSvg(item?: Anchor | SVGElement): void {
    const graph = item instanceof Anchor ? item : this;
    const element = this.element as SVGSVGElement;
    empty(element);
    this.onPrerender(element);
    Anchor.prototype.renderGraphSvg.call(graph, element);
  }

  // ----- drag ----- //

  setDragRotate(item: boolean | Anchor): void {
    if (!item) {
      return;
    }
    this.dragRotate = item === true ? this : item;

    this.bindDrag(this.element);
  }

  dragStart(event: Event, pointer: DragPointer): void {
    const dragRotate = this.dragRotate as Anchor;
    this.dragStartRX = dragRotate.rotate.x;
    this.dragStartRY = dragRotate.rotate.y;
    Dragger.prototype.dragStart.call(this, event, pointer);
  }

  dragMove(event: Event, pointer: DragPointer): void {
    const dragRotate = this.dragRotate as Anchor;
    const moveX = pointer.pageX - this.dragStartX;
    const moveY = pointer.pageY - this.dragStartY;
    const displaySize = Math.min(this.width, this.height);
    const moveRY = (moveX / displaySize) * TAU;
    const moveRX = (moveY / displaySize) * TAU;
    dragRotate.rotate.x = this.dragStartRX - moveRX;
    dragRotate.rotate.y = this.dragStartRY - moveRY;
    Dragger.prototype.dragMove.call(this, event, pointer);
  }
}

// mix in Dragger methods that Illustration does not override.
// class methods are non-enumerable, so copy descriptors rather than extend()
Object.getOwnPropertyNames(Dragger.prototype).forEach((key) => {
  if (!Object.hasOwn(Illustration.prototype, key)) {
    Object.defineProperty(Illustration.prototype, key, Object.getOwnPropertyDescriptor(Dragger.prototype, key)!);
  }
});

function empty(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}
