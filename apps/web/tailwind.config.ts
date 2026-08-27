import type { Config } from "tailwindcss";
import colors from "tailwindcss/colors";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "../../packages/shared/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: colors.indigo,
      },
      fontFamily: {
        sans: [
          "'Inter Variable'",
          "'Noto Sans TC Variable'",
          "'Microsoft JhengHei UI'",
          "'Microsoft JhengHei'",
          "'PingFang TC'",
          "'Noto Sans TC'",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        popover: "0 4px 6px -1px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
