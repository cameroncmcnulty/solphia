import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#050308",
        ink: "#0b0712",
        panel: "#100a18",
        line: "#2a1d3a",
        ghost: "#c9c2d4",
        mute: "#7a708c",
        acid: "#b8ff3c",
        cyan: "#5cffd8",
        blood: "#ff3d6e",
        warn: "#ffb020",
      },
      fontFamily: {
        display: ["var(--font-syne)", "sans-serif"],
        serif: ["var(--font-cormorant)", "serif"],
        mono: ["var(--font-plex)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(92, 255, 216, 0.18)",
        acid: "0 0 28px rgba(184, 255, 60, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
