import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    base: './', // تعيين المسارات لتصبح نسبية لتلافي مشاكل تحميل الموارد في الـ WebView
    plugins: [react(), tailwindcss()],
    build: {
      target: 'es2020', // 👈 توليد كود متوافق مع إصدارات WebView القديمة على أجهزة الأندرويد لمنع حدوث أخطاء المعالجة
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
