// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // If deploying to cat.joanne.wiki (root domain), leave base as '/'
  // If deploying to a subdirectory like github.com/user/repo, set base: '/repo-name/'
  base: '/',
});
