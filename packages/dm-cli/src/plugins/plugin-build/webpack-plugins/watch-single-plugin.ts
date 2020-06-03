
import * as path from 'path';
import log from '../../../common/log';
// 以下引用仅作为类型申明
import { IContext, IWebpackCompilerExt, IWebpackCompilationExt, ILooseObject } from '../../../interfaces';
class WatchSinglePlugin {
  private ctx: IContext;
  constructor (ctx: IContext) {
    this.ctx = ctx;
  }
  apply (compiler: IWebpackCompilerExt): void {
    const ctx = this.ctx;
    const dist = ctx.dist;
    const app = ctx.opts.app;
    const sassSuffixReg = new RegExp(`\\.${ctx.opts.sassSuffix}$`)
    compiler.hooks.emit.tap('WatchSinglePlugin', (compilation: IWebpackCompilationExt) => {
      const sourceDir = compilation.options!.context + path.sep;
      const oldFileTimestamps = compiler.$oldFileTimestamps || new Map<string, number>();
      if (!oldFileTimestamps.size) return;
      const watcher = compiler.watchFileSystem!.watcher
      const assets: ILooseObject = {}
      for (const key in watcher.mtimes) {
        let assetsPath = key.replace(sourceDir, '').replace(sassSuffixReg, '.wxss')

        // app.b.js => app.js，注：已经在ifelse-loader中将app.js中的内容替换为app.b.js内容，此处需要删除多余的带app后缀的文件生成。
        if (app) {
          const pathSeg = assetsPath.split('.');
          if (pathSeg[pathSeg.length - 2] === app) {
            pathSeg.splice(pathSeg.length - 2, 1)
            assetsPath = pathSeg.join('.');
          }
        }

        if (compilation.assets[assetsPath]) {
          assets[assetsPath] = compilation.assets[assetsPath];
        } else {
          log.warn('watch资源没有匹配到目标路径', key, path.resolve(dist, assetsPath))
        }
      }
      // 删除多余的文件生成
      compilation.assets = assets;
    });
    compiler.hooks.afterEmit.tap('WatchSinglePlugin', (compilation: IWebpackCompilationExt) => {
      // 执行webpack时会触发一次，此时 fileTimestamps 没有内容，compiler.watch时会再触发一次。此时fileTimestamps有内容，因此使用它作为watch启动后标识
      compiler.$oldFileTimestamps = compilation.fileTimestamps
    });
  }
}
export default WatchSinglePlugin;
