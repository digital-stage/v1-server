module.exports = {
    extends: [
        'airbnb-typescript/base',
        "plugin:prettier/recommended",
        "plugin:promise/recommended"
    ],
    rules: {
        "no-underscore-dangle": 0
    },
    parserOptions: {
        project: './tsconfig.json'
    }
};
