import { defineConfig } from "vite";

const page = (p: string) => decodeURIComponent(new URL(`./src/frontend/${p}`, import.meta.url).pathname);

export default defineConfig({
  root: "src/frontend",
  publicDir: "../../public",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    rollupOptions: {
      input: {
        main: page("index.html"),
        admin: page("admin/index.html"),
        informe: page("admin/informe.html"),
      },
    },
  },
  server: {
    port: 5179,
  },
});
