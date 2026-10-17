// quick & dirty drag event stuff
// messes up if multiple pointers/touches
export interface DragPointer {
  pageX: number;
  pageY: number;
}

export type DragElement = string | HTMLElement | SVGElement | null | undefined;

export interface DraggerOptions {
  startElement?: DragElement;
  onDragStart?: (pointer: DragPointer) => void;
  onDragMove?: (pointer: DragPointer, moveX: number, moveY: number) => void;
  onDragEnd?: () => void;
}

// check for browser window #85
const hasWindow = typeof window != "undefined";
// event support, default to mouse events
let downEvent = "mousedown";
let moveEvent = "mousemove";
let upEvent = "mouseup";
if (hasWindow) {
  if (window.PointerEvent) {
    // PointerEvent, Chrome
    downEvent = "pointerdown";
    moveEvent = "pointermove";
    upEvent = "pointerup";
  } else if ("ontouchstart" in window) {
    // Touch Events, iOS Safari
    downEvent = "touchstart";
    moveEvent = "touchmove";
    upEvent = "touchend";
  }
}

function noop(): void {}

export class Dragger {
  declare onDragStart: (pointer: DragPointer) => void;
  declare onDragMove: (pointer: DragPointer, moveX: number, moveY: number) => void;
  declare onDragEnd: () => void;
  declare dragStartX: number;
  declare dragStartY: number;

  constructor(options?: DraggerOptions) {
    this.create(options || {});
  }

  create(options: DraggerOptions): void {
    this.onDragStart = options.onDragStart || noop;
    this.onDragMove = options.onDragMove || noop;
    this.onDragEnd = options.onDragEnd || noop;

    this.bindDrag(options.startElement);
  }

  bindDrag(element: DragElement): void {
    const queryElement = this.getQueryElement(element);
    if (!queryElement) {
      return;
    }
    // disable browser gestures #53
    queryElement.style.touchAction = "none";
    queryElement.addEventListener(downEvent, this);
  }

  getQueryElement<E extends Element>(element: string | E | null | undefined): E | null | undefined {
    if (typeof element == "string") {
      // with string, query selector
      return document.querySelector<E>(element);
    }
    return element;
  }

  handleEvent(event: Event): void {
    const method = (this as unknown as Record<string, ((event: Event) => void) | undefined>)["on" + event.type];
    if (method) {
      method.call(this, event);
    }
  }

  onmousedown(event: MouseEvent): void {
    this.dragStart(event, event);
  }

  onpointerdown(event: PointerEvent): void {
    this.dragStart(event, event);
  }

  ontouchstart(event: TouchEvent): void {
    this.dragStart(event, event.changedTouches[0]);
  }

  dragStart(event: Event, pointer: DragPointer): void {
    event.preventDefault();
    this.dragStartX = pointer.pageX;
    this.dragStartY = pointer.pageY;
    if (hasWindow) {
      window.addEventListener(moveEvent, this);
      window.addEventListener(upEvent, this);
    }
    this.onDragStart(pointer);
  }

  ontouchmove(event: TouchEvent): void {
    // HACK, moved touch may not be first
    this.dragMove(event, event.changedTouches[0]);
  }

  onmousemove(event: MouseEvent): void {
    this.dragMove(event, event);
  }

  onpointermove(event: PointerEvent): void {
    this.dragMove(event, event);
  }

  dragMove(event: Event, pointer: DragPointer): void {
    event.preventDefault();
    const moveX = pointer.pageX - this.dragStartX;
    const moveY = pointer.pageY - this.dragStartY;
    this.onDragMove(pointer, moveX, moveY);
  }

  onmouseup(): void {
    this.dragEnd();
  }

  onpointerup(): void {
    this.dragEnd();
  }

  ontouchend(): void {
    this.dragEnd();
  }

  dragEnd(/* event */): void {
    window.removeEventListener(moveEvent, this);
    window.removeEventListener(upEvent, this);
    this.onDragEnd();
  }
}
