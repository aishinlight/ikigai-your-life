// Test-only helper: bundles each edge function with its npm deps inlined, so a local edge runtime
// without registry access can run them. Production deploys use the original sources.
import { build } from "esbuild";
import { readdirSync, statSync, mkdirSync } from "node:fs";
import path from "node:path";

const src = path.resolve("supabase/functions");
const out = process.argv[2];
if (!out) throw new Error("usage: node tests/bundle-functions.mjs <outdir>");
const strip = {
  name: "strip-npm-specifier",
  setup(b) {
    // node: builtins are only used by the SDK's credential-file helpers (unused when an API key is set);
    // stubbing them avoids the runtime fetching @types/node from the registry.
    b.onResolve({ filter: /^node:/ }, (args) => ({ path: args.path, namespace: "nodestub" }));
    b.onLoad({ filter: /.*/, namespace: "nodestub" }, () => ({ contents: "module.exports = {};", loader: "js" }));
    b.onResolve({ filter: /^npm:/ }, async (args) => {
      const spec = args.path.slice(4).replace(/^(@?[^@]+)@[^/]+/, "$1");
      const r = await b.resolve(spec, { kind: args.kind, resolveDir: process.cwd() });
      return r;
    });
  },
};
for (const name of readdirSync(src)) {
  if (name.startsWith("_") || !statSync(path.join(src, name)).isDirectory()) continue;
  mkdirSync(path.join(out, name), { recursive: true });
  await build({
    entryPoints: [path.join(src, name, "index.ts")],
    outfile: path.join(out, name, "index.ts"),
    bundle: true, format: "esm", platform: "neutral", target: "es2022",
    mainFields: ["module", "main"], conditions: ["deno", "worker", "browser", "import", "default"],
    plugins: [strip], logLevel: "warning",
  });
  console.log("bundled", name);
}
