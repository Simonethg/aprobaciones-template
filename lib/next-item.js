// Id of the card that follows `current` in the on-screen order. Null at the end.
export function nextItemId(ids, current) {
  const list = Array.isArray(ids) ? ids : [];
  const i = list.indexOf(current);
  if (i < 0 || i >= list.length - 1) return null;
  return list[i + 1];
}
