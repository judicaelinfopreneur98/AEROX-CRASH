/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080B10",
        surface: "#0E131F",
        card: "#141B2D",
        border: "#1F2942",
        primary: {
          DEFAULT: "#00F0FF",
          hover: "#33F3FF",
          glow: "rgba(0, 240, 255, 0.4)",
        },
        accent: {
          DEFAULT: "#8B5CF6",
          hover: "#A78BFA",
        },
        crash: {
          DEFAULT: "#FF3366",
          glow: "rgba(255, 51, 102, 0.4)",
        },
        success: {
          DEFAULT: "#10B981",
          hover: "#34D399",
          glow: "rgba(16, 185, 129, 0.4)",
        },
        warning: "#F59E0B",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.6)' },
        }
      }
    },
  },
  plugins: [],
};
