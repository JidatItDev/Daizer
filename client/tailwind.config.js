/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        tajawal: ["Tajawal", "sans-serif"],
        jaffna: ['"Post No Bills Jaffna ExtraBold"', "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
      colors: {
        "primary-dark": "#2C2E5F",
        "dashboard-bg": "#F1F1F1",
      },
      boxShadow: {
        "custom-primary": "0 0 20px rgba(0, 0, 0, 0.1)",
        "custom-secondary": "0 0 4px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
