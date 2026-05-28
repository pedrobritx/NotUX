import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
copyFileSync(resolve(dist, "index.html"), resolve(dist, "404.html"));
console.log("SPA fallback: copied dist/index.html → dist/404.html");
