// eslint.config.js (for ESLint 9+ with CommonJS)
module.exports = [
  {
    files: ["**/*.js"],
    ignores: ["node_modules/", "dist/", "coverage/"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "error",
      "semi": ["error", "always"],
    },
  },
];
