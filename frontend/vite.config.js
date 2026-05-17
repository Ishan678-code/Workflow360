import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite' // Ensure this is @tailwindcss/vite

const backendPort = process.env.VITE_BACKEND_PORT || "5000";
// In production you should set VITE_BACKEND_URL (e.g. https://xxxx.onrender.com)
// Otherwise we fall back to localhost for local dev.
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
