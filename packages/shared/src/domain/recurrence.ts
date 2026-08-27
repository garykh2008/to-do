export type RecurrenceFreq = "daily" | "weekly" | "monthly" | "yearly";

export type Weekday = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  interval: number;
  /** 只有 freq === "weekly" 時才有意義；不給的話就是「每 interval 週的同一天」 */
  byDay?: Weekday[];
}

const WEEKDAY_CODES: readonly Weekday[] = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
const WEEKDAY_LABELS: Record<Weekday, string> = { SU: "日", MO: "一", TU: "二", WE: "三", TH: "四", FR: "五", SA: "六" };
const WEEKDAYS: readonly Weekday[] = ["MO", "TU", "WE", "TH", "FR"];

export const RECURRENCE_PRESETS: readonly { label: string; rule: RecurrenceRule }[] = [
  { label: "每天", rule: { freq: "daily", interval: 1 } },
  { label: "每個工作日", rule: { freq: "weekly", interval: 1, byDay: [...WEEKDAYS] } },
  { label: "每週", rule: { freq: "weekly", interval: 1 } },
  { label: "每月", rule: { freq: "monthly", interval: 1 } },
  { label: "每年", rule: { freq: "yearly", interval: 1 } },
];

function parseDateParts(dateStr: string): { y: number; m: number; d: number } {
  const [y, m, d] = dateStr.split("-").map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

// 一律用 Date.UTC 組出時間戳、再用 getUTC* 讀回來，避免用本機時區建立 Date 物件時
// 因為日光節約、UTC 偏移量而讓日期跑掉一天——這個 app 的 due_date 全程都是「純日期字串」，
// 沒有時間、時區的概念，計算過程也不該中途混進時區。
function toDateStr(utcMs: number): string {
  const date = new Date(utcMs);
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// day 0 of "next month" is the last day of the target month—used to clamp e.g. 1/31 + 1 個月
// 到 2/28（而不是讓 Date.UTC 溢位跑到 3/3），31 號 + 1 年碰到非閏年的 2/29 同理。
function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

/** 算出下一次發生日期（純函式，好單元測試）。fromDate 是目前的 due_date（或今天，若原本沒設日期）。 */
export function getNextOccurrence(rule: RecurrenceRule, fromDate: string): string {
  const { y, m, d } = parseDateParts(fromDate);
  const base = Date.UTC(y, m - 1, d);

  if (rule.freq === "daily") {
    return toDateStr(base + rule.interval * DAY_MS);
  }

  if (rule.freq === "weekly") {
    if (rule.byDay && rule.byDay.length > 0) {
      // 從隔天開始一天一天找，找到第一個符合 byDay 的星期幾——一週內一定會繞回起點，
      // 不需要特別處理 interval（MVP 的 preset 都只用 interval=1 搭配 byDay）。
      const targetDays = new Set(rule.byDay.map((code) => WEEKDAY_CODES.indexOf(code)));
      const currentWeekday = new Date(base).getUTCDay();
      for (let offset = 1; offset <= 7; offset++) {
        if (targetDays.has((currentWeekday + offset) % 7)) {
          return toDateStr(base + offset * DAY_MS);
        }
      }
    }
    return toDateStr(base + 7 * rule.interval * DAY_MS);
  }

  if (rule.freq === "monthly") {
    const targetMonthIndex = m - 1 + rule.interval;
    const targetYear = y + Math.floor(targetMonthIndex / 12);
    const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
    const day = Math.min(d, daysInMonth(targetYear, normalizedMonthIndex));
    return toDateStr(Date.UTC(targetYear, normalizedMonthIndex, day));
  }

  // yearly
  const targetYear = y + rule.interval;
  const day = Math.min(d, daysInMonth(targetYear, m - 1));
  return toDateStr(Date.UTC(targetYear, m - 1, day));
}

export function describeRecurrence(rule: RecurrenceRule): string {
  if (rule.freq === "daily") {
    return rule.interval === 1 ? "每天" : `每 ${rule.interval} 天`;
  }

  if (rule.freq === "weekly") {
    if (rule.byDay && rule.byDay.length > 0) {
      const isWeekdays = rule.byDay.length === WEEKDAYS.length && WEEKDAYS.every((d) => rule.byDay!.includes(d));
      if (isWeekdays && rule.interval === 1) return "每個工作日";
      const days = rule.byDay.map((code) => WEEKDAY_LABELS[code]).join("、");
      return rule.interval === 1 ? `每週${days}` : `每 ${rule.interval} 週的${days}`;
    }
    return rule.interval === 1 ? "每週" : `每 ${rule.interval} 週`;
  }

  if (rule.freq === "monthly") {
    return rule.interval === 1 ? "每月" : `每 ${rule.interval} 個月`;
  }

  return rule.interval === 1 ? "每年" : `每 ${rule.interval} 年`;
}

/**
 * 打勾完成一個 todo 時共用的決策邏輯：三個 app（web/widget 的 Supabase 模式直接呼叫；
 * widget 的本機模式、local-web 則是透過 localDataEngine.toggleComplete 間接呼叫同一份邏輯）
 * 都要用同一份規則，不要各自刻一次「完成時要不要順便把日期往前推」的判斷。
 */
export function resolveCompletion(
  todo: { recurrence_rule: RecurrenceRule | null; due_date: string | null },
  isCompleted: boolean,
  today: string,
): { is_completed: boolean; due_date?: string } {
  if (isCompleted && todo.recurrence_rule) {
    return { is_completed: false, due_date: getNextOccurrence(todo.recurrence_rule, todo.due_date ?? today) };
  }
  return { is_completed: isCompleted };
}
