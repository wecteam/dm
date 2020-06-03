import chalk from 'chalk';
import * as purifyCSS from 'purify-css';
import * as prettyBytes from 'pretty-bytes';
import * as path from 'path';

import log from '../../../common/log';
// 以下引入只作为类型声明
import { IContext, IWebpackCompilerExt, IWebpackCompilationExt, IDepsGraph, IFileVexNode } from '../../../interfaces';
/**
 * 使用purify-css剔除没有用到的样式
 * @param content 样式可能被使用的上下文
 * @param css 样式内容
 * @param name 样式文件名称
 */
const _purify = (ctx: IContext, content: string, css: string, name: string): Promise<string> => {
  return new Promise(resolve => {
    const whitelist = ctx.opts.purifyCSSWhiteList![name] || [];
    try {
      purifyCSS(content, css, {
        minify: false,
        whitelist
      }, (purifiedCSS: string) => {
        resolve(purifiedCSS);
      });
    } catch (e) {
      resolve(css);
    }
  });
};

/**
 * 执行样式文件优化
 * @param contentArr 可能用到样式的文件内容
 * @param css 样式内容
 * @param name 样式文件名
 */
const cssTreeShaking = (ctx: IContext, contentArr: string[] = [], css: string, name = 'css'): Promise<{css: string; name: string}> => {
  return _purify(ctx, contentArr.join('\n'), css, name).then((purifiedCSS: string) => {
    const originalSize = Buffer.from(css.replace(/[\s\n\r\f\s\t\v]/g, '')).length;
    const optimizedSize = Buffer.from(purifiedCSS.replace(/[\s\n\r\f\s\t\v]/g, '')).length;
    const saved = originalSize - optimizedSize;
    const percent = originalSize > 0 ? (saved / originalSize) * 100 : 0;
    if (saved > 0) {
      log.log(chalk.green(
        `优化${name}，节省了${prettyBytes(saved)}-${percent.toFixed(1).replace(/\.0$/, '')}%`
      ));
    }
    return {
      css: purifiedCSS,
      name
    };
  });
};

/**
 * 获取样式文件被哪些文件引用
 *  - 隐式引用（微信规则引用，被wxml和js文件引用）
 *  - 显示引用，其他wxss文件使用 @import 方式引入(被wxss文件引用)
 */
function getWxssIssuers (ctx: IContext, depsGraph: IDepsGraph, wxssPath: string): string[] {
  let result: string[] = [];
  wxssPath = path.resolve(ctx.cwd, wxssPath);
  // 隐式引用
  const jsFile = wxssPath.replace(/\.wxss$/, '.js');
  const wxmlFile = wxssPath.replace(/\.wxss$/, '.wxml');
  result.push(jsFile);
  result.push(wxmlFile);
  if (depsGraph) {
    // 显式引用
    const fileVex = depsGraph.getFileVexNode(wxssPath);
    if (fileVex) {
      const issuers = depsGraph.getHeadVexNodes<IFileVexNode>(fileVex, 'file')
        .filter(item => /\.wxss$/.test(item.filepath))
        .map(item => item.filepath);
      result = result.concat(issuers);
      issuers.forEach((item: string) => {
        result = result.concat(getWxssIssuers(ctx, depsGraph, item));
      });
    }
  }
  return Array.from(new Set(result)).map(item => path.relative(ctx.cwd, item));
}
/**
 * 获取文件的依赖
 */
function getFileDeps (ctx: IContext, depsGraph: IDepsGraph, filePath: string): string[] {
  let result: string[] = [];
  filePath = path.resolve(ctx.cwd, filePath);
  const fileVex = depsGraph.getFileVexNode(filePath);
  if (fileVex) {
    const deps = depsGraph.getTailVexNodes<IFileVexNode>(fileVex, 'file')
      .filter(item => !/\.(json|wxss)$/.test(item.filepath))
      .map(item => item.filepath);
    result = result.concat(deps).map(item => path.relative(ctx.cwd, item));
  }
  return Array.from(new Set(result));
}
class CssTreeshakingPlugin {
  ctx: IContext;
  constructor (ctx: IContext) {
    this.ctx = ctx;
  }
  apply (compiler: IWebpackCompilerExt): void {
    compiler.hooks.emit.tapPromise('CssTreeshakingPlugin', (compilation: IWebpackCompilationExt) => {
      log.debug('blue', chalk.blue('开始处理 cssTreeShaking'));
      const promiseArr = [];
      for (const key in compilation.assets) {
        if (/\.wxss$/.test(key) && Object.prototype.hasOwnProperty.call(compilation.assets, key)) {
          let issuers = getWxssIssuers(this.ctx, compiler!.$depsGraph!, key);
          // app.wxss和被app.wxss引用的样式都是全局样式
          const isGlobalStyle = key === 'app.wxss' || issuers.includes('app.wxss');
          log.debug('收集 wxss', key);
          if (isGlobalStyle) {
            // 全局样式可能被任何文件用到
            const sources: string[] = [];
            for (const k in compilation.assets) {
              if (/\.(js|wxs|wxml)$/.test(k) && Object.prototype.hasOwnProperty.call(compilation.assets, k)) {
                sources.push(compilation.assets[k].source());
              }
            }
            promiseArr.push(cssTreeShaking(this.ctx, sources, compilation.assets[key].source(), key));
          } else {
            issuers = issuers.filter((item) => !/\.(json|wxss)/.test(item));
            // 获取依赖的依赖
            issuers.forEach((item: string) => {
              const issuerDeps = getFileDeps(this.ctx, compiler.$depsGraph!, item);
              issuers = issuers.concat(issuerDeps);
            });
            issuers = Array.from(new Set(issuers)); // 去重
            if (issuers && issuers.length) {
              promiseArr.push(cssTreeShaking(this.ctx, issuers.map((iss) => {
                if (compilation.assets[iss]) {
                  return compilation.assets[iss].source();
                } else {
                  return '';
                }
              }), compilation.assets[key].source(), key));
            }
          }
        }
      }
      if (promiseArr.length) {
        log.debug('start treeShaking');
        return Promise.all(promiseArr).then(resultArr => {
          log.debug('end treeShaking');
          resultArr.forEach(item => {
            compilation.assets[item.name] = {
              source: function (): string {
                return item.css;
              },
              size: function (): number {
                return item.css.length;
              }
            };
          });
        });
      }
      return Promise.resolve();
    });
  }
}
export default CssTreeshakingPlugin;
