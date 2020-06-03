
import { IWebpackError, IContext, IWebpack } from '../../../interfaces'
import * as fs from 'fs';
import log from '../../../common/log';
import chalk from 'chalk';
import moment = require('moment');

class Compiler {
  private webpackConfig: IWebpack.Configuration;
  private ctx: IContext;
  constructor (ctx: IContext, webpackConfig: IWebpack.Configuration) {
    this.ctx = ctx;
    this.webpackConfig = webpackConfig;
  }
  private outputLog (stats: IWebpack.Stats, writeLog?: boolean): void {
    if (stats.hasErrors()) {
      log.warn(chalk.yellow(stats.toString({
        builtAt: false,
        hash: false,
        entrypoints: false,
        version: false,
        timings: false,
        modules: false,
        warnings: false,
        assets: false,
        colors: false // 在控制台展示颜色
      })))
    }
    if (writeLog) {
      const logPath = `${this.webpackConfig.output!.path}-build.log`;
      fs.writeFileSync(logPath, stats.toString({
        assets: false,
        chunks: false, // 使构建过程更静默无输出
        colors: false // 在控制台展示颜色
      }));
      log.log(chalk.green('编译日志:'), logPath);
    }
  }

  /** 文件改动会重新触发构建流程，非单页抽取时时间比较长，待优化 */
  async watch (): Promise<void> {
    return new Promise((resolve, reject) => {
      const compiler = this.ctx.webpack(this.webpackConfig);
      compiler.watch({
        poll: undefined,
        ignored: /node_modules/
      }, (err, stats) => {
        if (err) {
          log.error(err)
          return reject(err);
        }
        this.outputLog(stats);
        log.log(`${moment().format('HH:mm:ss')} watch build success`);
        resolve();
      })
    })
  }
  async build (): Promise<void> {
    return new Promise((resolve, reject) => {
      log.debug(`开始分析依赖`);
      this.ctx.webpack(this.webpackConfig, (err: IWebpackError, stats) => {
        if (err) {
          log.error(err.stack || err);
          if (err.details) {
            log.error(err.details);
          }
          return reject(err);
        }
        // 输出日志
        this.outputLog(stats, true);
        resolve()
      });
    })
  }
}

export { Compiler }
