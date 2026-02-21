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
        primary: {
          DEFAULT: "#FF4D4F",
          light: "#FF7875",
          dark: "#D9363E",
        },
        secondary: {
          DEFAULT: "#00D4AA",
          light: "#33DFBE",
          dark: "#00A884",
        },
      }
    }
  },
  plugins: []
};

export default config;
