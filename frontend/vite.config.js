import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "axios", "qrcode.react"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-utils": ["axios", "qrcode.react"],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
    warmup: {
      clientFiles: ["./src/main.jsx", "./src/App.jsx"],
    },
  },
});
