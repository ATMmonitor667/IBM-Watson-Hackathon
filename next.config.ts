import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    // There is an unrelated package-lock.json in the user's home directory, so
    // Turbopack's root inference walks up past the repo. Pin it to this file's
    // directory, or the build resolves modules against the wrong root.
    root: path.dirname(fileURLToPath(import.meta.url)),
  },
};

export default nextConfig;
