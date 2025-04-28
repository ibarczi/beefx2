module.exports = {
  "env": {
    "browser": true,
    "es2021": true
  },
  "extends": [
    "eslint:recommended",
    "standard",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    // "plugin:@typescript-eslint/recommended"
  ],
  "overrides": [
  ],
  // "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": [
    "react",
    // "@typescript-eslint"
  ],
  "rules": {
    "semi": "off",
    "indent": "off",
    "quotes": "off",
    "quote-props": "off",
    "eqeqeq": "warn",
    "prefer-const": "warn",
    "comma-dangle": "off",
    "eol-last": "off",
    "spaced-comment": "off",
    "nu-multi-spaces": "off",
    "multiline-ternary": "off",
    "dot-notation": "off",
    "valid-typeof": "off",
    "no-useless-catch": "off",
    "no-throw-literal": "off",
    "no-useless-escape": "off",
    "no-floating-decimal": "off",
    "no-unused-vars": "off",
    "no-debugger": "off", // to warn if not on dev
    "no-return-assign": "off",
    "array-callback-return": "off",
    "no-unmodified-loop-condition": "off",
    "no-trailing-spaces": "off",
    "space-before-function-paren": "off",
    "object-curly-spacing": "off",
    "object-curly-newline": "off",
    "object-property-newline": "off",
    "no-void": "off",
    "n/no-callback-literal": "off",
    "react/no-unknown-property": "off",
    "react/no-unescaped-entities": "off",
    "import/no-duplicates": "warn",
    "import/first": "off",
    "react/prop-types": "off"
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  }
}
