import path from "path";

import { config } from "dotenv";
import { defineConfig } from "vitest/config";

config(); // loads variables from .env into process.env before tests run

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
