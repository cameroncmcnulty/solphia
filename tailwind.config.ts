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
        ghost: "#efeaf8",
        mute: "#8b82a0",
        acid: "#14F195",
        violet: "#9945FF",
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
