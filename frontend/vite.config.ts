import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],

    server: {
      port: 5173,
    },

    preview: {
      port: 4173,
    },

    build: {
      target: 'es2020',
      sourcemap: mode === 'production' ? 'hidden' : true,
      chunkSizeWarningLimit: 600,

      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'redux-vendor': ['@reduxjs/toolkit', 'react-redux', 'redux'],
            'io-vendor': ['axios', 'socket.io-client'],
          },
        },
      },

      minify: 'esbuild',
    },

    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
    },
  };
})