/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-case': [0],
    'body-max-line-length': [1, 'always', 120],
    'footer-max-line-length': [1, 'always', 120],
    'scope-enum': [
      2,
      'always',
      [
        'mobile',
        'admin',
        'api',
        'types',
        'api-client',
        'constants',
        'ui',
        'config',
        'docs',
        'ci',
        'deps',
        'repo',
      ],
    ],
  },
};
