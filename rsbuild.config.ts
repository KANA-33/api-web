import { pluginReact } from "@rsbuild/plugin-react";
import { defineConfig } from "@rsbuild/core";
import path from "node:path";

const devBackendOrigin = process.env.DEV_BACKEND_ORIGIN;
const devProxyOptions = {
  target: devBackendOrigin || "http://127.0.0.1:3002",
  changeOrigin: true,
  cookieDomainRewrite: "",
  cookiePathRewrite: "/",
};

export default defineConfig({
  plugins: [pluginReact()],
  html: {
    title: "Commercial Console",
  },
  server: {
    proxy: devBackendOrigin
      ? {
          "/api": devProxyOptions,
          "/pg": devProxyOptions,
          "/v1": devProxyOptions,
          "/mj": devProxyOptions,
        }
      : undefined,
  },
  source: {
    entry: {
      index: "./src/main.tsx",
    },
  },
  resolve: {
    alias: {
      "@app": path.resolve(__dirname, "src/app"),
      "@features": path.resolve(__dirname, "src/features"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@widgets": path.resolve(__dirname, "src/widgets"),
    },
  },
});
