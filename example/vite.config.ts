import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // Deployed on thais-marcon.com/raycasting, BASE_PATH overrides it for GitHub Pages
  base: process.env.BASE_PATH ?? "/raycasting/",
  plugins: [react()],
  // The library source is imported from ../src, use a single copy of React
  resolve: { dedupe: ["react", "react-dom"] },
})
