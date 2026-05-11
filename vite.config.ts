import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/index.ts', 'src/types.ts'],
      outDir: 'dist',
    }),
  ],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AutoTintura',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'js' : format === 'cjs' ? 'cjs' : 'umd.js'}`,
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        exports: 'named',
      },
    },
    sourcemap: true,
    minify: false,
    emptyOutDir: true,
  },
});