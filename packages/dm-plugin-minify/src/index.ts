import { minify } from './minify';
import { IContext, ILooseObject } from '@wecteam/dm-cli';

class DmPluginMinify {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    this.initHooks();
  }

  initHooks (): void{
    const buildHooks = this.ctx.hooks.build;

    buildHooks.release.tapPromise('DmPluginMinify-all', async () => {
      if (this.ctx.opts.release) {
        await minify(this.ctx);
      }
    })
  }
}

export = DmPluginMinify
