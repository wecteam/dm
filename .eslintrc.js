// https://cn.eslint.org/docs/user-guide/configuring
module.exports = {
  'root': true,
  'parser':'@typescript-eslint/parser',
  // 'parserOptions': {
  //     'project': './tsconfig.json'
  // },
  'env': {
    'node': true,
    'jest': true,
  },
  // https://standardjs.com/readme-zhcn.html
  'extends': [
    'standard',
    'plugin:@typescript-eslint/recommended'
],

  // 私有配置
  'rules': {
    'semi':'off',
    'no-debugger': 'error',
    'no-throw-literal':'off',
    'no-var':'error',
    '@typescript-eslint/no-this-alias':'off',
    '@typescript-eslint/no-explicit-any':'warn' ,
    '@typescript-eslint/interface-name-prefix':['error',{ 'prefixWithI': 'always' }],
    '@typescript-eslint/no-non-null-assertion':'off'
    // '@typescript-eslint/no-unused-vars':['warn',{ 'argsIgnorePattern': '^_' }]
  }
}
