import { createRequire } from "node:module";
import path from "node:path";

// Optional external toolchain keeps validation dependencies outside the submission.
const require = createRequire(import.meta.url);
const external = process.env.BLOCK_RHYTHM_DEPS;
const resolve = (name) =>
  require.resolve(name, external ? { paths: [external] } : undefined);
export default {
  base: "./",
  resolve: {
    alias: {
      "react-dom": path.dirname(resolve("react-dom/package.json")),
      react: path.dirname(resolve("react/package.json")),
    },
  },
  build: { target: "es2022", sourcemap: false },
};
