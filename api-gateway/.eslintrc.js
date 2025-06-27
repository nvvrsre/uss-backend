module.exports = {
  env: { node: true, es2021: true },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 12, sourceType: 'module' },
  rules: {
    // add your custom rules here
    "no-unused-vars": ["error", { "args": "none" }],
  },
};
