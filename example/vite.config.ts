import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: "/raycasting/",
  plugins: [react()],
  // The library source is imported from ../src, use a single copy of React
  resolve: { dedupe: ["react", "react-dom"] },
})
