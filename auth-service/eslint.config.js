// eslint.config.js (ESLint 9+ Flat Config)
export default [
  {
    files: ['**/*.js'],
    ignores: ['node_modules/', 'dist/', 'coverage/'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': 'error',
      'semi': ['error', 'always'],
      // add more rules as needed
    },
  },
];
