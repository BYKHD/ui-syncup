import { defineConfig } from "tsup";

export default defineConfig({
  /**
   * ENTRY: The file tsup starts bundling from.
   * It follows all imports recursively and packs everything into one file.
   */
  entry: ["index.ts"],

  /**
   * FORMAT: "cjs" = CommonJS, the standard format for Node.js CLI tools.
   * All npm packages use this by default. Alternative is "esm" but cjs
   * has broader compatibility with older Node versions.
   */
  format: ["cjs"],

  /**
   * TARGET: Which Node.js version to compile for.
   * This affects which modern JS features get transpiled vs kept as-is.
   */
  target: "node20",

  /**
   * OUTDIR: Where the compiled file goes.
   * dist/index.js is what the "bin" field in package.json points to.
   */
  outDir: "dist",

  /**
   * CLEAN: Delete the dist/ folder before each build.
   * Prevents stale files from a previous build lingering around.
   */
  clean: true,

  /**
   * BUNDLE: Pack all imports (including node_modules like commander, zod)
   * into the single output file. This is why we don't need "dependencies"
   * in package.json — they're baked into the bundle.
   */
  bundle: true,

  /**
   * SPLITTING: Code splitting generates multiple output files for lazy loading.
   * We don't need it for a CLI — one file is simpler.
   */
  splitting: false,

  /**
   * SOURCEMAP: Maps compiled JS back to original TS for debugging.
   * Skip it for a CLI tool to keep the published package lean.
   */
  sourcemap: false,

  /**
   * DTS: Generate TypeScript declaration files (.d.ts).
   * Only needed if other TS projects import your package as a library.
   * A CLI tool doesn't need this.
   */
  dts: false,

  /**
   * SHIMS: Automatically polyfill Node ESM globals that don't exist in CJS.
   * Most importantly: transforms `import.meta.url` → `__filename` equivalent.
   * Our constants.ts uses import.meta.url, so this is required.
   */
  shims: true,

  /**
   * EXTERNAL: Packages listed here are NOT bundled — they stay as runtime
   * require() calls and must be installed separately (listed in dependencies).
   *
   * Why commander? It ships dual ESM+CJS exports. When bundled, tsup includes
   * both variants, creating two separate Command class instances. This breaks
   * `program.addCommand(subCommand)` because the instanceof check fails across
   * the two copies. Keeping it external uses one canonical instance at runtime.
   */
  external: ["commander"],

  /**
   * MINIFY: Compress the output (shorter variable names, remove whitespace).
   * Optional. Keep false during development, true for smaller published size.
   */
  minify: false,
});
