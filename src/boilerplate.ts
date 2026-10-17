export const TAU: number = Math.PI * 2;

export function extend<A extends object, B extends object>(a: A, b?: B): A & B {
  for (const prop in b) {
    (a as Record<string, unknown>)[prop] = b[prop];
  }
  return a as A & B;
}

export function lerp(a: number, b: number, alpha: number): number {
  return (b - a) * alpha + a;
}

export function modulo(num: number, div: number): number {
  return ((num % div) + div) % div;
}

const powerMultipliers: Record<number, (a: number) => number> = {
  2: (a) => a * a,
  3: (a) => a * a * a,
  4: (a) => a * a * a * a,
  5: (a) => a * a * a * a * a
};

export function easeInOut(alpha: number, power: number = 2): number {
  if (power == 1) {
    return alpha;
  }
  alpha = Math.max(0, Math.min(1, alpha));
  const isFirstHalf = alpha < 0.5;
  let slope = isFirstHalf ? alpha : 1 - alpha;
  slope /= 0.5;
  // make easing steeper with more multiples
  const powerMultiplier = powerMultipliers[power] || powerMultipliers[2];
  let curve = powerMultiplier(slope);
  curve /= 2;
  return isFirstHalf ? curve : 1 - curve;
}
