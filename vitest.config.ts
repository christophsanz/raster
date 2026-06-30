import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		// No tests yet — keep `vitest run` (and the CI test job) green until some exist.
		passWithNoTests: true
	}
});
