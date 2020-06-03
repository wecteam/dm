
import JsTreeshakingPlugin from './webpack-plugins/js-treeshaking-plugin';
import CssTreeshakingPlugin from './webpack-plugins/css-treeshaking-plugin';
import { IContext, ILooseObject } from '../../interfaces';
class DmPluginOptimize {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    this.configWebpackPlugins()
  }
  configWebpackPlugins (): void {
    const ctx = this.ctx;
    const config = ctx.config;

    if (ctx.opts.jsTreeShaking) {
      config
        .plugin('JsTreeshakingPlugin')
        .use(JsTreeshakingPlugin);
    }

    if (ctx.opts.cssTreeShaking) {
      config
        .plugin('CssTreeshakingPlugin')
        .use(CssTreeshakingPlugin, [ctx]);
    }
  }
}

export = DmPluginOptimize
