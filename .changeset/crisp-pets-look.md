---
"zdog-ts": major
---

Zdog TS is a TypeScript implementation of [Zdog](https://github.com/metafizzy/zdog). It is modified with TypeScript support for bundler projects (Vite, Webpack, etc.)

#### Improvements

- **Modules**: every file uses named exports instead of the UMD wrapper. There’s no default `Zdog` object any more; `import * as Zdog from "zdog-ts"` gives you the same `Zdog.Shape`, `Zdog.TAU` and so on.
- **Classes**: each type is a real ES class with its own typed options (`ShapeOptions`, `BoxOptions`, etc.), so misspelled or wrongly typed options are caught at compile time.
- **Instance fields**: Zdog had set properties inside `create()`, which runs from the base constructor. Normal class fields would then overwrite those values and hide the Box/Cylinder property setters. They are now declared with `declare` and never given initial values.
- **`Shape.subclass({...})`**: still works, so existing Zdog-style code keeps running.
- **Dragger in Illustration**: Class methods aren’t picked up by Zdog’s old `extend()` copy, and is replaced by `Object.defineProperty()`. Illustration still gets Dragger’s methods copied into it.
- **New file**: `src/renderer.ts` holds the shared Renderer types.

#### Behavior Changes

- For an SVG illustration, `illo.width` and `illo.height` are now numbers. The original stored the raw attribute strings, e.g. `"240"`.
- `vector.rotate()` now returns the vector even when no rotation is passed (it used to return `undefined`).
- `Illustration.renderGraphCanvas`/`renderGraphSvg` now render the illustration itself if you pass them anything other than a shape. The original would crash.
- `CylinderEllipse` originally ran a `noop` and was never used; dropped.
- `subclass()` in `Anchor` no longer adds duplicate option keys. The original had a typo in its duplicate check (`!x.indexOf(k) != 1`).
