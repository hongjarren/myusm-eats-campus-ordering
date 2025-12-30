import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // Raise the warning threshold a bit, but also split big libs into their own chunks
    chunkSizeWarningLimit: 1200,
   
  },
});
