import path from 'node:path';
import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '.env.test') });

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
