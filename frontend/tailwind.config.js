/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        dash: {
          bg: "#050506",
          primary: "#FAFAFA",
          secondary: "#B8B6B0",
          tertiary: "#76746E",
          success: "#6BE3A4",
          warning: "#F2C063",
          danger: "#FF6B6B",
        },
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Inter",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      maxWidth: {
        dash: "1100px",
      },
    },
  },
  plugins: [],
};
