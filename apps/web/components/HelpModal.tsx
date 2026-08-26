"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

const SECTIONS = [
  {
    title: "新增待辦事項",
    body: "在輸入框打字後按 Enter 或點「新增」；可以順便點日曆圖示設定到期日。",
  },
  {
    title: "子項目",
    body: "點項目上的「+」新增子項目；把一個項目拖到另一個項目正中間會變成它的子項目（僅支援一層）；點項目左側箭頭可以收合/展開子項目。",
  },
  {
    title: "排序與搬移",
    body: "拖曳項目到另一個項目的上緣/下緣可以調整順序；拖到左側清單上可以搬到別的清單。",
  },
  {
    title: "已完成項目",
    body: "打勾後項目會移到清單底部「已完成」的收合區塊，點開可以取消勾選復原。",
  },
  {
    title: "清單管理",
    body: "側邊欄底部「+ 新增清單」建立清單；滑鼠移到清單上會出現重新命名／刪除按鈕（Inbox 清單不能刪除，裡面的待辦事項也會一併刪除）。",
  },
  {
    title: "所有清單／行事曆",
    body: "「所有清單」把每個清單的待辦事項疊在同一頁顯示；「行事曆」用月曆檢視有設定到期日的項目。",
  },
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- 點背景關閉是標準 modal 行為，內層卡片已擋掉冒泡
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-md flex-col rounded-lg bg-white shadow-popover"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-neutral-800">使用說明</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="關閉"
          >
            <X size={18} />
          </button>
        </div>
        <dl className="flex flex-col gap-3 overflow-y-auto px-5 py-4 text-sm">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <dt className="font-medium text-neutral-800">{section.title}</dt>
              <dd className="text-neutral-500">{section.body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
