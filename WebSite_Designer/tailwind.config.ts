import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        fed: {
          navy: "#15304d",
          blue: "#274f7c",
          sky: "#d8e7f6",
          gold: "#caa45f",
          cream: "#f7f2e8",
          paper: "#fbfaf7",
          ink: "#26303c"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"]
      },
      boxShadow: {
        card: "0 18px 48px rgba(21, 48, 77, 0.10)",
        panel: "0 28px 72px rgba(21, 48, 77, 0.14)"
      },
      backgroundImage: {
        "fed-grid":
          "linear-gradient(rgba(39, 79, 124, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(39, 79, 124, 0.08) 1px, transparent 1px)"
      }
    }
  },
  plugins: []
};

export default config;

