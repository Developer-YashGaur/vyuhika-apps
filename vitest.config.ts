import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      // Use mammoth's browser build in tests too, since that's what the site runs.
      mammoth: fileURLToPath(new URL("./node_modules/mammoth/mammoth.browser.js", import.meta.url)),
      // "server-only" throws when imported outside Next's server build, so tests use an empty stand-in.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
});
