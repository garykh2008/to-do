interface ImportMetaEnv {
  /** 不設定＝線上模式（Supabase + 登入）；"local" ＝本機模式（資料存本機檔案，免登入） */
  readonly VITE_DATA_MODE?: "local";
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
