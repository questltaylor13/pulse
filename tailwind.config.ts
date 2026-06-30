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
        // Idle borders for chips/pills/inputs. Fixes the previously-undefined
        // `border-line` token that filter chips referenced (was falling back
        // to Tailwind's default gray-200).
        line: "#e5e5e5",
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
        // Bold display scale (Space Grotesk) for section + card titles.
        "display-sm": ["20px", { lineHeight: "24px", fontWeight: "700" }],
        display: ["24px", { lineHeight: "28px", fontWeight: "700" }],
        "display-lg": [
          "32px",
          { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "800" },
        ],
      },
      zIndex: {
        chromeHeader: "19",
        chromeSearch: "18",
        chromeTabs: "17",
        chromeRail: "16",
        bottomNav: "20",
        modal: "50",
      },
      boxShadow: {
        card: "0 1px 2px rgba(26,26,26,0.04), 0 4px 16px rgba(26,26,26,0.06)",
        cardHover: "0 6px 16px rgba(26,26,26,0.10), 0 16px 40px rgba(26,26,26,0.14)",
        pill: "0 1px 2px rgba(232,93,58,0.18), 0 3px 10px rgba(232,93,58,0.22)",
        chrome: "0 1px 0 rgba(26,26,26,0.06)",
      },
      backgroundImage: {
        // Bright brand gradient for decorative / non-text surfaces (hero,
        // wordmark, card accents).
        "brand-gradient":
          "linear-gradient(135deg, #E85D3A 0%, #F0763E 45%, #00A884 100%)",
        // Deeper gradient for text-bearing controls (active chips/buttons):
        // coral-dark → teal-dark keeps white text at WCAG AA across the span.
        "brand-gradient-strong":
          "linear-gradient(135deg, #C7492A 0%, #007d63 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, #FFF1EC 0%, #E6FBF6 100%)",
      },
    }
  },
  plugins: []
};

export default config;
