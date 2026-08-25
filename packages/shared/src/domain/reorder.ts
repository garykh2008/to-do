/**
 * position 排序運算：採用「間隔 1000」策略。
 * 新增時直接加上一個 gap；插入兩筆資料之間時取中點；
 * 當整數中點已經跟前後值重複（gap 用盡）時，呼叫端需要對該清單做一次 renumber。
 */

export const POSITION_GAP = 1000;

export function firstPosition(): number {
  return POSITION_GAP;
}

export function appendPosition(lastPosition: number | null | undefined): number {
  return (lastPosition ?? 0) + POSITION_GAP;
}

export function insertBetweenPosition(
  before: number | null | undefined,
  after: number | null | undefined,
): { position: number; needsRenumber: boolean } {
  if (before == null && after == null) {
    return { position: POSITION_GAP, needsRenumber: false };
  }
  if (before == null) {
    const position = Math.floor(after! / 2);
    return { position, needsRenumber: position <= 0 || position >= after! };
  }
  if (after == null) {
    return { position: before + POSITION_GAP, needsRenumber: false };
  }
  const position = Math.floor((before + after) / 2);
  return { position, needsRenumber: position <= before || position >= after };
}

export function renumberPositions<T>(orderedItems: readonly T[]): { item: T; position: number }[] {
  return orderedItems.map((item, index) => ({ item, position: (index + 1) * POSITION_GAP }));
}
