import { defineConfig } from "tsup";

export default defineConfig({
  entry: { bashLoader: "src/bashLoader.ts" },
  outDir: "public",
  format: ["esm"],
  bundle: true,
  noExternal: [/@bash-web\/.*/],
  dts: false,
  clean: false,
  platform: "browser",
  target: "es2020",
  sourcemap: false,
  outExtension: () => ({ js: ".js" }),
  tsconfig: "tsconfig.loader.json",
});
