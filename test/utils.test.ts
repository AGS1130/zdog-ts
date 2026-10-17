import { describe, expect, test } from "bun:test";
import { easeInOut, extend, lerp, modulo, TAU, Vector } from "../src";

describe("utils", () => {
  test("TAU is a full turn", () => {
    expect(TAU).toBe(Math.PI * 2);
  });

  test("extend copies properties onto the target", () => {
    const target = { a: 1 };
    expect(extend(target, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  test("lerp & modulo", () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(modulo(-1, 3)).toBe(2);
  });

  test("easeInOut", () => {
    expect(easeInOut(0.3, 1)).toBe(0.3);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(0.25, 3)).toBeCloseTo(0.0625);
    expect(easeInOut(2)).toBe(1);
  });
});

describe("Vector", () => {
  test("set sanitizes, write only sets given coords", () => {
    const vec = new Vector({ x: 1 });
    expect(vec).toMatchObject({ x: 1, y: 0, z: 0 });
    vec.write({ y: 2 });
    expect(vec).toMatchObject({ x: 1, y: 2, z: 0 });
  });

  test("arithmetic", () => {
    const vec = new Vector({ x: 1, y: 2, z: 3 });
    vec.add({ x: 1 }).subtract({ z: 1 }).multiply(2).multiply({ y: 0.5 });
    expect(vec).toMatchObject({ x: 4, y: 2, z: 4 });
    expect(vec.isSame({ x: 4, y: 2, z: 4 })).toBe(true);
    expect(vec.isSame(null)).toBe(false);
  });

  test("rotate", () => {
    const vec = new Vector({ x: 1 }).rotate({ z: TAU / 4 });
    expect(vec.x).toBeCloseTo(0);
    expect(vec.y).toBeCloseTo(1);
  });

  test("magnitude, lerp & copy", () => {
    expect(new Vector({ x: 3, y: 4 }).magnitude()).toBe(5);
    expect(new Vector({ x: 3, y: 4, z: 12 }).magnitude2d()).toBe(5);
    expect(new Vector().lerp({ x: 10 }, 0.5).x).toBe(5);
    const vec = new Vector({ z: 1 });
    expect(vec.copy()).not.toBe(vec);
    expect(vec.copy()).toEqual(vec);
  });
});
