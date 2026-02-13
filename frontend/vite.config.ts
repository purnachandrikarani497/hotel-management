import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const api = env.VITE_API_URL || "http://localhost:3011";
  return {
    base: "/",
    server: {
      host: "0.0.0.0",
      port: 8080,
      strictPort: false,
      cors: true,
      proxy: {
        "/api": { target: api, changeOrigin: true },
        "/uploads": { target: api, changeOrigin: true },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
