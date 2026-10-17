import { Anchor, getOptionKeys } from "./anchor";
import type { AnchorOptions, Defaults } from "./anchor";
import type { RenderContext, Renderer } from "./renderer";

export interface GroupOptions extends AnchorOptions {
  updateSort?: boolean;
  visible?: boolean;
}

export class Group extends Anchor {
  constructor(options?: GroupOptions) {
    super(options);
  }
  static defaults: Defaults = {
    ...Anchor.defaults,
    updateSort: false,
    visible: true
  };

  static optionKeys: string[] = getOptionKeys(Anchor.optionKeys, this.defaults);

  declare updateSort: boolean;
  declare visible: boolean;

  // ----- update ----- //

  updateSortValue(): void {
    let sortValueTotal = 0;
    this.flatGraph.forEach((item) => {
      item.updateSortValue();
      sortValueTotal += item.sortValue;
    });
    // average sort value of all points
    // def not geometrically correct, but works for me
    this.sortValue = sortValueTotal / this.flatGraph.length;

    if (this.updateSort) {
      this.flatGraph.sort(Anchor.shapeSorter);
    }
  }

  // ----- render ----- //

  render(ctx: RenderContext, renderer: Renderer): void {
    if (!this.visible) {
      return;
    }

    this.flatGraph.forEach((item) => {
      item.render(ctx, renderer);
    });
  }

  // actual group flatGraph only used inside group
  updateFlatGraph(): void {
    // do not include self
    const flatGraph: Anchor[] = [];
    this.flatGraph = this.addChildFlatGraph(flatGraph);
  }

  // do not include children, group handles rendering & sorting internally
  getFlatGraph(): Anchor[] {
    return [this];
  }
}
