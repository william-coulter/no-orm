import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  target: "node23",
  format: ["esm"],
  splitting: false,
  shims: false,
  clean: true,
  dts: true,
  banner: ({ format }) => {
    if (format === "esm") {
      return {
        js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
      };
    }
  },
});
