import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    root: __dirname,
    test: {
        environment: 'node',
        pool: 'forks',
        include: ['src/**/tests/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@alentapp/shared': path.resolve(__dirname, '../shared/index.ts'),
        },
    },
});
