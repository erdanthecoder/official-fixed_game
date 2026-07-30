import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base so the built app also works from a subfolder or file server.
  base: './',
  build: {
    rollupOptions: {
      output: {
        // The Firebase SDK is the bulk of the bundle and changes far less often
        // than app code — splitting it keeps rebuilds cheap for returning users.
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
