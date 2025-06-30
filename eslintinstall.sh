#!/bin/bash

# List of backend service directories
services=(
  "api-gateway"
  "auth-service"
  "cart-service"
  "catalog-service"
  "notification-service"
  "order-service"
  "payment-service"
  "product-service"
  "promo-service"
)

# ESLint flat config content
eslint_config_content='export default [
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
'

for service in "${services[@]}"
do
  echo "Setting up ESLint v9 and config in $service..."

  cd "$service" || { echo "Failed to enter $service, skipping..."; continue; }

  # Install ESLint v9
  npm install --save-dev eslint@^9

  # Add/overwrite eslint.config.js
  echo "$eslint_config_content" > eslint.config.js

  # Remove old config files
  rm -f .eslintrc .eslintrc.js .eslintrc.json .eslintrc.yaml .eslintrc.yml .eslintignore

  cd ..
done

echo "✅ ESLint v9 and flat config set up in all services!"
