import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      colors: {
        // Phase 1 home redesign palette
        coral: {
          DEFAULT: "#E85D3A",
          dark: "#C7492A",
          light: "#FF7855",
        },
        teal: {
          DEFAULT: "#00A884",
          light: "#33DFBE",
          soft: "#E6FBF6",
        },
        ink: {
          DEFAULT: "#1a1a1a",
          soft: "#333333",
        },
        mute: {
          DEFAULT: "#666666",
          soft: "#bbbbbb",
          hush: "#f5f5f5",
          divider: "#f0f0f0",
          band: "#fafafa",
        },
        surface: {
          DEFAULT: "#ffffff",
          raised: "#ffffff",
          muted: "#fafafa",
        },
        // Legacy alias: keep `primary` pointing at coral so the old pages keep working
        // while the new home components adopt `coral` explicitly.
        primary: {
          DEFAULT: "#E85D3A",
          light: "#FF7855",
          dark: "#C7492A",
        },
        secondary: {
          DEFAULT: "#00A884",
          light: "#33DFBE",
          dark: "#007d63",
        },
      },
      borderRadius: {
        card: "14px",
        pill: "20px",
        search: "28px",
      },
      fontSize: {
        meta: ["11px", { lineHeight: "14px" }],
        body: ["14px", { lineHeight: "20px" }],
        title: ["17px", { lineHeight: "22px" }],
      },
      zIndex: {
        chromeHeader: "19",
        chromeSearch: "18",
        chromeTabs: "17",
        chromeRail: "16",
        bottomNav: "20",
        modal: "50",
      },
    }
  },
  plugins: []
};

export default config;
