/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Open Sans", "sans-serif"],
        heading: ["Poppins", "sans-serif"],
      },
      colors: {
        primary: "#0D9488",
        secondary: "#2DD4BF",
        accent: "#EA580C",
      },
    },
  },
  plugins: [],
};
