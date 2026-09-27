/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f2f9ee",
          100: "#e0f1d6",
          200: "#c2e3af",
          300: "#9dd180",
          400: "#78bd55",
          500: "#579c37",
          600: "#437c29",
          700: "#356123",
          800: "#2c4d20",
          900: "#26411e",
        },
      },
    },
  },
  plugins: [],
};
