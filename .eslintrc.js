module.exports = {
    extends: ['airbnb-typescript/base'],
    rules: {
        "no-underscore-dangle": 0,
        "endOfLine": "auto",
        'prettier/prettier': [
            'error',
            {
                endOfLine: 'auto',
            },
        ],
    },
    parserOptions: {
        project: './tsconfig.json'
    }
};
