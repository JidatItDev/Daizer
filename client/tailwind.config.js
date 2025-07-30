/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        tajawal: ["Tajawal", "sans-serif"],
      },
      colors: {
        "primary-dark": "#2C2E5F",
      },
    },
  },
  plugins: [],
};
