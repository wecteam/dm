import * as path from 'path';
import * as fs from 'fs';
import { IWebpack, IWebpackCompilerExt } from '../../../interfaces';
export = function (this: IWebpack.loader.LoaderContext, content: string): string {
  this.cacheable && this.cacheable();
  const _compiler = this._compiler as IWebpackCompilerExt;
  const reg = /@import\s+['"]([^'"]*)['"].*/gi;
  let r: RegExpExecArray|null = null;
  let result = 'module.exports = ""';
  const requires = [];
  // 去注释
  content = content.replace(/\/\*([\s\S]*?)\*\//g, '');
  _compiler.$fileCache!.set(this.resourcePath, content);
  /* eslint-disable no-cond-assign */
  while (r = reg.exec(content)) {
    let wxssPath = r[1];
    if (wxssPath[0] === '/') { // /开头的绝对路径要转成小程序根目录
      wxssPath = path.resolve(_compiler.context, wxssPath.substr(1)).replace(/\\/g, '/'); // 注意win环境处理
    } else if (wxssPath[0] !== '.') {
      wxssPath = './' + wxssPath;
    }
    if (!path.extname(wxssPath)) {
      wxssPath += '.wxss';
    }
    const cssPath = wxssPath.replace(/\.wxss$/, `.${this.query.sassSuffix || 'css'}`)
    if (fs.existsSync(path.resolve(this.context, cssPath))) {
      requires.push(`require('${cssPath}');`);
    } else {
      requires.push(`require('${wxssPath}');`);
    }
  }
  if (requires.length) {
    result = requires.join('\n') + result;
  }
  return result
}
