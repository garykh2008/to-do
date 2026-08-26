import { useEffect } from "react";
import { X } from "lucide-react";

const SECTIONS = [
  {
    title: "新增待辦事項",
    body: "上方輸入框打字後按 Enter 或點「+」快速新增到 Inbox；可以點日曆圖示設定到期日。",
  },
  {
    title: "子項目",
    body: "點項目上的「+」新增子項目；把一個項目拖到另一個項目正中間會變成它的子項目；有子項目的項目左側會出現箭頭，可以收合/展開。",
  },
  {
    title: "排序與搬移",
    body: "拖曳項目到另一個項目的上緣/下緣可以調整順序；拖到底部的清單標籤（或右鍵選「移到清單」）可以搬到別的清單。",
  },
  {
    title: "已完成項目",
    body: "打勾後項目會移到清單底部「已完成」的收合區塊，點開可以取消勾選復原。",
  },
  {
    title: "編輯項目",
    body: "點項目標題或到期日可以直接改；右鍵點項目可以刪除。",
  },
  {
    title: "清單管理",
    body: "底部標籤列最後的虛線「+」新增清單；右鍵點清單標籤可以重新命名／刪除（Inbox 不能刪除）。",
  },
  {
    title: "常駐系統匣",
    body: "按右上角 X 只是把視窗隱藏到系統匣，程式仍在背景執行；真的要結束請從系統匣圖示右鍵選「結束」。",
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
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-neutral-800">使用說明</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="關閉"
        >
          <X size={16} />
        </button>
      </div>
      <dl className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-3 text-xs">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <dt className="font-medium text-neutral-800">{section.title}</dt>
            <dd className="text-neutral-500">{section.body}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
