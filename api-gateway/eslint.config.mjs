export default [
  {
    ignores: ['node_modules/', 'dist/', 'build/'],
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'module',
      globals: { require: true, module: true, process: true },
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    rules: {
      "no-unused-vars": ["warn", { "args": "none" }],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      // add more rules as needed
    },
  },
];
