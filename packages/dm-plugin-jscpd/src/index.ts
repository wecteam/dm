import { detect } from './jscpd/jscpd';
import { IContext, ILooseObject } from '@wecteam/dm-cli';
import { IOptsExt } from './hook-types';

class DmPluginJscpd {
  static cmdHooks = {
    audit: [['--jscpd', '重复代码分析']]
  }
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    const opts: IOptsExt = this.ctx.opts;
    if (opts.jscpd) {
      this.initHooks();
    }
  }
  initHooks (): void {
    const auditHooks = this.ctx.hooks.audit;
    const log = this.ctx.log;
    auditHooks.run.tapPromise('DmPluginJscpd-run', async () => {
      log.start('重复分析');
      await detect(this.ctx);
    })
  }
}

exports = DmPluginJscpd;
