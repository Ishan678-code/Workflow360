import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Ensure this is @tailwindcss/vite

const backendPort = process.env.VITE_BACKEND_PORT || "3000";
const backendUrl = process.env.VITE_BACKEND_URL || `http://localhost:${backendPort}`;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 plugin
  ],
  server: {
    proxy: {
      "/api": backendUrl,
    },
  },
});
