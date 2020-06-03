
import * as path from 'path';
import { IContext, IWebpack } from '../../../interfaces';

class WebpackConfig {
  private ctx: IContext;
  /** 基本配置 */
  public config: IWebpack.Configuration;

  constructor (ctx: IContext) {
    this.ctx = ctx;
    this.config = this.getConfig();
  }

  /** 获取配置 */
  getConfig (): IWebpack.Configuration {
    const ctx = this.ctx;
    const chain = ctx.config

    // 处理webpack钩子
    typeof ctx.opts.webpack === 'function' && ctx.opts.webpack(chain);

    // 处理基本配置:输入、输出、context
    chain.context(ctx.cwd).end();
    chain.output.path(ctx.dist).filename('.dm-entry.js');
    chain.mode('none');

    const config = chain.toConfig();
    config.entry = path.resolve(ctx.cwd, '.dm-entry.js'); // webpack-chain暂不支持单入口形式 https://github.com/neutrinojs/webpack-chain/issues/230
    config.node = false; // webpack-chain暂不支持直接将node设置为false https://github.com/neutrinojs/webpack-chain/issues/209
    return config
  }
}

export { WebpackConfig }
