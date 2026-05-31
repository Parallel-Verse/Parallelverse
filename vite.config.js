import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const isIosBundle = process.env.VITE_IOS_BUNDLE === 'true';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: isIosBundle
      ? [
          {
            find: './data/scriptureData.js',
            replacement: '/src/data/scriptureData.ios.js',
          },
        ]
      : [],
  },
});
