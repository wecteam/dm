import { IContext, ILooseObject } from '../../interfaces';
import { pack } from '../../plugins/plugin-build/pack';
import AuditComponentPlugin from './webpack-plugins/audit-component-plugin';
import AuditFilePlugin from './webpack-plugins/audit-file-plugin';
import AuditVarPlugin from './webpack-plugins/audit-var-plugin';
import AuditModuleRequirePlugin from './webpack-plugins/audit-module-require-plugin';
import AuditModuleExportPlugin from './webpack-plugins/audit-module-export-plugin';
import AuditExportResultPlugin from './webpack-plugins/audit-export-result-plugin';

class DmPluginAudit {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    this.initHooks();
    this.configWebpackPlugins();
  }
  initHooks (): void{
    const auditHooks = this.ctx.hooks.audit;
    const log = this.ctx.log;
    auditHooks.beforeRun.tapPromise('DmPluginAudit-beforeRun', async () => {
      this.ctx.utils.checkEnv(this.ctx);
    })

    auditHooks.run.tapPromise('DmPluginAudit-run', async () => {
      const ctx = this.ctx
      log.log('需要进行依赖分析')
      await pack(ctx);
    })
  }

  configWebpackPlugins (): void{
    const ctx = this.ctx;
    const config = ctx.config;

    if (ctx.opts.action === 'audit') {
      config
        .plugin('AuditComponentPlugin').use(AuditComponentPlugin, [ctx]).end()
        .plugin('AuditFilePlugin').use(AuditFilePlugin, [ctx]).end()
        .plugin('AuditVarPlugin').use(AuditVarPlugin, [ctx]).end()
        .plugin('AuditModuleRequirePlugin').use(AuditModuleRequirePlugin, [ctx]).end()
        .plugin('AuditModuleExportPlugin').use(AuditModuleExportPlugin, [ctx]).end()
        .plugin('AuditExportResultPlugin').use(AuditExportResultPlugin, [ctx]).end()
    }
  }
}

export = DmPluginAudit
