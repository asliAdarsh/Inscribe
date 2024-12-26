import path from "path"
import react from "@vitejs/plugin-react"

import eslintPlugin from 'vite-plugin-eslint';
import { defineConfig } from "vite"
 
export default defineConfig({
  // base: "/Inscribe-Frontend",
  plugins: [react(),eslintPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
