import { type Config } from "prettier";

const config: Config = {
  trailingComma: "none",
  endOfLine: "auto",
  plugins: ["prettier-plugin-tailwindcss"]
};

export default config;
