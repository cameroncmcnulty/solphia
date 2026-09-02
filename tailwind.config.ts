import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#04000a",
        ink: "#0b0614",
        panel: "#100818",
        line: "#2a1848",
        ghost: "#f7f4ff",
        mute: "#cfc7dd",
        acid: "#14F195",
        violet: "#c9a8ff",
        cyan: "#80eaff",
        blood: "#ff4d7a",
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
