/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        accent: "#f3f4f6",
        card: "#ffffff",
        border: "#e5e7eb",
        background: "#f9fafb",
      },
    },
  },
  plugins: [],
}