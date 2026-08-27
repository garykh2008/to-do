import { HelpCircle, LogOut, Minus, X } from "lucide-react";
import appIcon from "../assets/app-icon.png";

export function TitleBar({ onHelp, onLogout }: { onHelp: () => void; onLogout?: () => void }) {
  return (
    <div className="titlebar-drag flex h-9 shrink-0 items-center justify-between bg-white pl-3 pr-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-500">
        <img src={appIcon} alt="" className="h-4 w-4 rounded" />
        TODO 小工具
      </div>
      <div className="titlebar-no-drag flex items-center gap-0.5">
        {onLogout && (
          <button
            type="button"
            onClick={() => {
              if (confirm("登出？")) onLogout();
            }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
            aria-label="登出"
          >
            <LogOut size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={onHelp}
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="使用說明"
        >
          <HelpCircle size={14} />
        </button>
        <button
          type="button"
          onClick={() => window.windowControls.minimize()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="最小化"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          onClick={() => window.windowControls.close()}
          className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-red-500 hover:text-white"
          aria-label="關閉（會留在系統匣）"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
