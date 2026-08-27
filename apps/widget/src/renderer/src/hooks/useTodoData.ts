import { useLocalTodoData } from "./useLocalTodoData";
import { useSupabaseTodoData } from "./useSupabaseTodoData";

/**
 * VITE_DATA_MODE 是 build 時就決定的常數（不同的 electron-builder 設定各自打包），
 * 不會在執行期間變動，所以在模組載入時就選好要用哪個 hook 完全符合 React hooks 規則——
 * useTodoData 本身每次 render 都是「同一個函式」，不是每次 render 才臨時判斷要呼叫哪個 hook。
 */
export const useTodoData = import.meta.env.VITE_DATA_MODE === "local" ? useLocalTodoData : useSupabaseTodoData;
