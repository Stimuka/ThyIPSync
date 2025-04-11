import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0', // Maak Vite toegankelijk voor externe verbindingen
    port: 3000, // Stel poort in op 3000
  },
});
