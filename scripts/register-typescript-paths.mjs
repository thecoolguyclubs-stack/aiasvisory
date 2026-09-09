import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { dirname, extname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

function existingTypeScriptUrl(path) {
  for (const candidate of [path, path + ".ts", path + ".tsx"]) {
    if (existsSync(candidate)) return pathToFileURL(candidate).href;
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      const url = existingTypeScriptUrl(join(projectRoot, "src", specifier.slice(2)));
      if (url) return { shortCircuit: true, url };
    }

    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") &&
      !extname(specifier)
    ) {
      const url = existingTypeScriptUrl(
        join(dirname(fileURLToPath(context.parentURL)), specifier),
      );
      if (url) return { shortCircuit: true, url };
    }

    return nextResolve(specifier, context);
  },
});
