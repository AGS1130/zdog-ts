import { defineConfig, type UserConfig } from "tsdown";

const config: UserConfig = defineConfig({
  banner: `/**
 * The code is copied from https://github.com/metafizzy/zdog and modified with TypeScript support for bundler projects (Vite, Webpack, etc.)
 *
 * Copyright (c) David DeSandro (https://desandro.com)
 */`,
  dts: { generator: "oxc" },
  format: ["cjs", "esm"],
  target: "esnext"
});

export default config;
