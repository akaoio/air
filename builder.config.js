export default {
  entry: "src/index.ts",
  formats: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node",
  external: [
    "@akaoio/gun",
    "node-fetch",
    /^@akaoio\//,
    /^node:/
  ]
}