/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      roboto: ['Roboto', 'sans-serif'],
      poppins: ['Poppins', 'serif'],
      inter: ['Inter', 'sans-serif']
    },
  },
  plugins: [],
}

