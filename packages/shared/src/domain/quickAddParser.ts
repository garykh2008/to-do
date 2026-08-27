export interface ParsedQuickAdd {
  title: string;
  dueDate: string | null;
  priority: number | null;
  labels: string[];
}

const WEEKDAY_CHAR_TO_INDEX: Record<string, number> = {
  日: 0,
  天: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
};

const DAY_MS = 24 * 60 * 60 * 1000;

// 跟 recurrence.ts 一樣的理由：全程用 Date.UTC 組時間戳、getUTC* 讀回來，
// 不要用本機時區建立 Date 物件，避免日期因為時區/日光節約跑掉。
function toDateStr(utcMs: number): string {
  const date = new Date(utcMs);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDateParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

interface DateMatch {
  index: number;
  length: number;
  dateStr: string;
}

function matchExplicitWord(text: string, todayBase: number): DateMatch | null {
  const words: [string, number][] = [
    ["今天", 0],
    ["明天", 1],
    ["後天", 2],
  ];
  for (const [word, offset] of words) {
    const index = text.indexOf(word);
    if (index !== -1) {
      return { index, length: word.length, dateStr: toDateStr(todayBase + offset * DAY_MS) };
    }
  }
  return null;
}

function matchWeekday(text: string, todayBase: number, todayWeekday: number): DateMatch | null {
  const match = /(下)?(?:週|星期)([一二三四五六日天])/.exec(text);
  if (!match) return null;
  const targetChar = match[2] as string;
  const target = WEEKDAY_CHAR_TO_INDEX[targetChar];
  if (target === undefined) return null;
  let offset = (target - todayWeekday + 7) % 7;
  if (match[1]) offset += 7; // 「下週X」一定跳到下一週，即使今天剛好就是那個星期幾
  return { index: match.index, length: match[0].length, dateStr: toDateStr(todayBase + offset * DAY_MS) };
}

function matchRelativeDays(text: string, todayBase: number): DateMatch | null {
  const match = /(\d{1,3})\s*天後/.exec(text);
  if (!match) return null;
  const n = Number(match[1]);
  return { index: match.index, length: match[0].length, dateStr: toDateStr(todayBase + n * DAY_MS) };
}

function matchExplicitDate(text: string, todayBase: number, todayY: number): DateMatch | null {
  const match = /(\d{1,2})\/(\d{1,2})/.exec(text) ?? /(\d{1,2})月(\d{1,2})日?/.exec(text);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // 沒給年份：假設是今年；如果那個日期今年已經過了，當作講的是明年同一天。
  let candidate = Date.UTC(todayY, month - 1, day);
  if (candidate < todayBase) candidate = Date.UTC(todayY + 1, month - 1, day);
  return { index: match.index, length: match[0].length, dateStr: toDateStr(candidate) };
}

/**
 * Quick Add 輸入框的自然語言解析：從一段文字裡挑出日期／優先權／標籤，剩下的當標題。
 * 純函式（today 用 YYYY-MM-DD 字串傳入，不要在裡面呼叫 new Date()），好單元測試。
 * 三個 app 的 Quick Add 輸入框都呼叫同一份，手動的日期/優先權/標籤選擇器仍然保留，
 * 解析錯的時候可以手動改，兩者不互斥。
 */
export function parseQuickAdd(input: string, today: string): ParsedQuickAdd {
  const { y: todayY, m: todayM, d: todayD } = parseDateParts(today);
  const todayBase = Date.UTC(todayY, todayM - 1, todayD);
  const todayWeekday = new Date(todayBase).getUTCDay();

  let text = input;
  const labels: string[] = [];

  // 標籤：@標籤名（連續非空白字元，遇到下一個空白或另一個 @/! 就結束），可以有多個。
  text = text.replace(/@([^\s@!]+)/g, (_match, name: string) => {
    labels.push(name);
    return " ";
  });

  // 優先權：!1~!4 或 p1~p4，前後要是空白或字串邊界，避免誤吃到字裡的 p1 這種子字串。
  let priority: number | null = null;
  text = text.replace(/(^|\s)(?:!([1-4])|[pP]([1-4]))(?=\s|$)/, (_match, lead: string, bang?: string, pNum?: string) => {
    priority = Number(bang ?? pNum);
    return lead;
  });

  // 日期：照常見講法試幾種，抓到第一種符合的就停止（同一段文字只認一個日期）。
  const dateMatch =
    matchExplicitWord(text, todayBase) ??
    matchWeekday(text, todayBase, todayWeekday) ??
    matchRelativeDays(text, todayBase) ??
    matchExplicitDate(text, todayBase, todayY);

  let dueDate: string | null = null;
  if (dateMatch) {
    dueDate = dateMatch.dateStr;
    text = text.slice(0, dateMatch.index) + " " + text.slice(dateMatch.index + dateMatch.length);
  }

  const title = text.replace(/\s+/g, " ").trim();

  return { title, dueDate, priority, labels };
}
