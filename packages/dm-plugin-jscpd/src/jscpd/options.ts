export default {
  detectInFiles: [process.cwd()],
  minLines: 20, // 至少重复行数
  maxLines: 1000, // 最多重复行数
  // 必须要这里配置的类型才支持
  formatsExts: {
    javascript: ['js', 'wxs'],
    typescript: ['ts'],
    markup: ['wxml'],
    css: ['wxss', 'css']
  },
  mode: 'mild', // strict,mild,weak
  ignore: [
    'node_modules/**'
  ],
  reporters: ['console', 'json', 'time'],
  blame: false, // 目前无效，先设置为true
  gitignore: true,
  output: '../dm-audit'
}
