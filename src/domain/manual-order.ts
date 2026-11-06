export function arrangeByOrder<T>(entries: T[], keyOf: (entry: T) => string, order: string[]): T[] {
  const position = new Map(order.map((key, index) => [key, index]));
  const known = (entry: T) => position.has(keyOf(entry));
  const placeOf = (entry: T) => position.get(keyOf(entry)) ?? 0;
  const fresh = entries.filter((entry) => !known(entry));
  const arranged = entries.filter(known).sort((a, b) => placeOf(a) - placeOf(b));
  return [...fresh, ...arranged];
}

export function moveKey(keys: string[], moving: string, target: string, after: boolean): string[] {
  if (moving === target) return keys;
  const rest = keys.filter((key) => key !== moving);
  const index = rest.indexOf(target) + (after ? 1 : 0);
  return [...rest.slice(0, index), moving, ...rest.slice(index)];
}
