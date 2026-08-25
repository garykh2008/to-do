import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@to-do/shared"],
  output: "standalone",
  // monorepo: 讓 Next.js 從 workspace 根目錄追蹤依賴，standalone 輸出才會包含 packages/shared
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

export default nextConfig;
