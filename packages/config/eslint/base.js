// Shared ESLint flat config (base for TS-only packages).
// Apps install eslint + typescript-eslint themselves and extend this.
// Stub for Week 1 — populated when first app needs linting.
export default [
  {
    ignores: ['dist/', 'build/', 'node_modules/', '.turbo/', '.next/', '.expo/'],
  },
];
