// happy-dom has no canvas 2D context, so record the calls Zdog makes instead

export type Call = [string, ...unknown[]];

export function createRecordingContext(calls: Call[] = []): CanvasRenderingContext2D {
  const state: Record<string | symbol, unknown> = {};
  return new Proxy(state, {
    get(target, key) {
      if (key in target) {
        return target[key];
      }
      return (...args: unknown[]) => calls.push([String(key), ...args]);
    },
    set(target, key, value) {
      calls.push([String(key) + "=", value]);
      target[key] = value;
      return true;
    }
  }) as unknown as CanvasRenderingContext2D;
}
