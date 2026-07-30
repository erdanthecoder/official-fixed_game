import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the built app also works from a subfolder or file server.
  base: './',
  server: {
    port: 5173,
    open: true,
  },
});
