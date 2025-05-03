// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "https://verse-48io.onrender.com",
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: "localhost"
      },
      "/uploads": {
        target: "https://verse-48io.onrender.com",
        changeOrigin: true,
      }
    }
  }
});
