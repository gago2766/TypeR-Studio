import { defineConfig } from 'vitest/config';

// إعداد مستقل للاختبارات: لا يحمّل إضافات التطبيق (react / tailwind)
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
