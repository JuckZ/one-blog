const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/pages/**/*.{html,js,ts,jsx,tsx}",
    "./src/components/**/*.{html,js,ts,jsx,tsx}",
    "./posts/**/*.{md,mdx}",
    './node_modules/pliny/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

