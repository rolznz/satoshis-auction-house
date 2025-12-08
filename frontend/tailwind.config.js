import { fontFamily } from "tailwindcss/defaultTheme";

module.exports = {
  theme: {
    fontFamily: {
      sans: ["Inter var", ...fontFamily.sans],
    },
    extend: {},
  },
};
