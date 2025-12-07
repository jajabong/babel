import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const isProduction = mode === 'production'

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      hmr: {
        overlay: true,
        timeout: 1000,
      },
      fs: {
        strict: false,
      },
    },
    plugins: [
      react({
        // Enable React Fast Refresh only in development
        fastRefresh: !isProduction,
        // Optimize JSX for production
        jsxRuntime: 'automatic',
        // Enable React 19 features
        jsxImportSource: 'react',
      }),
      isProduction &&
        visualizer({
          filename: 'dist/stats.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'treemap',
        }),
      isProduction &&
        visualizer({
          filename: 'dist/stats-network.html',
          open: false,
          gzipSize: true,
          brotliSize: true,
          template: 'network',
        }),
    ].filter(Boolean),
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      // Remove React DevTools in production
      __DEV__: !isProduction,
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
      minify: isProduction ? 'terser' : false,
      sourcemap: !isProduction,
      rollupOptions: {
        output: {
          // Enhanced code splitting
          manualChunks: (id) => {
            // React and related
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            // Google AI SDK
            if (id.includes('@google/genai')) {
              return 'vendor-genai'
            }
            // UI components
            if (id.includes('src/components/ui')) {
              return 'chunk-ui'
            }
            // Hooks
            if (id.includes('src/hooks')) {
              return 'chunk-hooks'
            }
            // Services and utilities
            if (id.includes('src/services') || id.includes('src/utils')) {
              return 'chunk-utils'
            }
            // Context
            if (id.includes('src/contexts')) {
              return 'chunk-context'
            }
            // Node modules not in other chunks
            if (id.includes('node_modules')) {
              return 'vendor-other'
            }
          },
          chunkFileNames: (chunkInfo) => {
            const facadeModuleId = chunkInfo.facadeModuleId
            if (facadeModuleId?.includes('src')) {
              return 'assets/[name]-[hash].js'
            }
            return 'assets/vendor-[name]-[hash].js'
          },
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.') || []
            const ext = info[info.length - 1]
            if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/.test(assetInfo.name || '')) {
              return 'assets/media/[name]-[hash][extname]'
            }
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name || '')) {
              return 'assets/images/[name]-[hash][extname]'
            }
            if (/\.css$/.test(assetInfo.name || '')) {
              return 'assets/css/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          },
        },
        // External dependencies that shouldn't be bundled
        external: [],
      },
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          // Additional optimization options
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
          passes: 2,
        },
        mangle: {
          safari10: true,
          // Keep class names for React DevTools in development
          keep_classnames: !isProduction,
        },
        format: {
          comments: false,
        },
      },
      chunkSizeWarningLimit: 300, // Lower threshold for better performance
      reportCompressedSize: isProduction,
      cssCodeSplit: true,
      assetsInlineLimit: 4096,
      modulePreload: {
        polyfill: true,
        resolveDependencies: (filename, deps) => {
          return deps.filter((dep) => !dep.includes('.css'))
        },
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', '@google/genai'],
      force: !isProduction,
      // Pre-bundle dependencies for faster dev server
      exclude: [],
    },
    esbuild: {
      target: 'esnext',
      // Additional ESBuild optimizations
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    // Performance optimizations
    css: {
      devSourcemap: !isProduction,
      preprocessorOptions: {},
    },
    preview: {
      port: 3000,
      host: '0.0.0.0',
    },
  }
})
