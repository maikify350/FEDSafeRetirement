import { cpSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const source = resolve("New");
const destination = resolve("dist");

rmSync(destination, { recursive: true, force: true });
cpSync(source, destination, { recursive: true });
await import("./build-shared-components.mjs");
