import * as path from 'path';

import { IWebpack } from '../../../interfaces';

// 注意loader的导出不能使用export default function
export = function (this: IWebpack.loader.LoaderContext, content: string): string {
  this.cacheable && this.cacheable();
  // this.value = content;  // ts编译后会在文件头添加 use strict,导致TypeError: Cannot add property value, object is not extensible
  const _compiler = this._compiler;
  const reg = /<(import|include|wxs)[^>]*src\s*=\s*['"]([^'"]*)['"][^>]*>/gi;
  let r: RegExpExecArray|null = null;
  let result = 'module.exports = ""';
  const requires = [];

  // 去注释
  content = content.replace(/<!--([\s\S]*?)-->/g, '');

  /* eslint-disable no-cond-assign */
  while (r = reg.exec(content)) {
    if (r[2][0] === '/') { // /开头的绝对路径要转成小程序根目录
      r[2] = path.resolve(_compiler.context, r[2].substr(1)).replace(/\\/g, '/');
    } else if (r[2][0] !== '.') {
      r[2] = './' + r[2];
    }

    // 默认使用.wxml
    if (!path.extname(r[2])) {
      r[2] += '.wxml';
    }

    requires.push(`require('${r[2]}');`);
  }
  if (requires.length) {
    result = requires.join('\n') + result;
  }

  return result
}
