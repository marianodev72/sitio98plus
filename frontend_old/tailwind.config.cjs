/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#001b3a",
        navyLight: "#123b63",
        navyDark: "#00081a",
        gold: "#f6c453",
        sand: "#f5f3ea",
        danger: "#dc2626",
      },
      fontFamily: {
        sans: ['system-ui', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 18px 45px rgba(15,23,42,0.25)",
      },
    },
  },
  plugins: [],
};
