/**
 * ！！！仅做调试及演示使用，cli实际的入口在bin目录！！！
 */

import { build, preview, audit, create, config } from './index'
import { parseOpts } from './impl/options.impl'
import log from './common/log';
import commander = require('commander')

// eslint-disable-next-line
const packageJson = require('../package.json');

// dm --version  dm --help
commander
  .version(packageJson.version);

// dm new
commander
  .command('new')
  .alias('n')
  .option('-t, --type [value]', '新建类型(page/component)')
  .option('-n, --name [value]', '名称')
  .description('新建')
  .action(command => {
    create(parseOpts(command));
  });

// dm build
commander
  .command('build')
  .alias('b')
  // 开发相关
  .option('-w, --watch', '启动文件监听')
  .option('-n, --no-deps', '不做依赖分析')
  .option('-p, --page <value>', '单页抽取') // <value>表示当有app参数时必须带值，[value]表示可选，不填时command.app == true
  .option('--tabbar', '保留tabbar及相关页面')
  // 通用
  .option('-a, --app <value>', '指定小程序')
  .option('-o, --open', '启动开发者工具')
  .option('--wxcli <value>', '小程序开发者工具cli路径')
  .option('-i, --include [value]', '需要额外添加的目录')
  .option('-d,--output.build <value>', '指定生成文件目录')
  // 发布相关
  .option('-r, --release', '发布')
  .option('-v, --version <value>', '版本号')
  .option('--dev', '内测版本')
  .option('-t, --tree-shaking', '函数级依赖分析')
  .option('-c, --css-tree-shaking', '无用样式剔除')
  .option('--cwd <value>', 'cwd')
  .description('项目打包')
  .action(command => {
    build(parseOpts(command));
  });

// dm preview
commander
  .command('preview')
  .alias('p')
  .option('-c, --css-tree-shaking', '无用样式剔除')
  .option('-a, --app [value]', '指定小程序')
  .option('-p, --page [value]', '指定编译单个页面')
  .option('-n, --path-name [value]', '打开的页面，不填表示首页')
  .option('-q, --query [value]', '页面参数')
  .option('-d, --output.preview <value>', '指定生成文件目录')
  .description('预览小程序，生成预览二维码')
  .action(command => {
    preview(parseOpts(command));
  });

// dm audit
commander
  .command('audit')
  .alias('a')
  .option('-a, --app [value]', '指定小程序')
  .option('-d, --output.audit <value>', '指定生成文件目录')
  .option('--only-check-package', '仅检测分包优化')
  .option('--only-check-duplicate', '仅检测重复代码')
  .description('项目审计')
  .action(command => {
    audit(parseOpts(command));
  });

// dm audit
commander
  .command('config <cmd>')
  .alias('c')
  .description('全局配置')
  .action((cmd, key, value) => {
    config([cmd, key, value]);
  });

commander.parse(process.argv);

// 命令校验
const VALID_COMMAND = [
  '--help', '-h',
  '--version', '-V',
  'build', 'b',
  'new', 'n',
  'preview', 'p',
  'audit', 'a',
  'config', 'c'
];
if (process.argv.length <= 2) {
  log.warn('输入dm --help查看使用说明');
} else if (!VALID_COMMAND.includes(process.argv[2])) {
  log.warn('不支持的命令，输入dm --help查看使用说明');
}
