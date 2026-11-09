import { defineConfig } from "vite";

export default defineConfig({
  root: "src/frontend",
  publicDir: "../../public",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    assetsDir: "assets",
  },
  server: {
    port: 5179,
  },
});
