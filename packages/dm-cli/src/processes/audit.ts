
import { Context } from '../impl/context.impl';
import { IAuditOpts, IOpts } from '../interfaces';
import log from '../common/log';

export async function audit (auditOpts?: IAuditOpts): Promise<void> {
  const opts: IOpts = { action: 'audit', ...auditOpts }
  const ctx = Context.getInstance(opts);

  const auditHooks = ctx.hooks.audit;
  try {
    await auditHooks.beforeRun.promise();

    await auditHooks.run.promise();

    await auditHooks.done.promise();
  } catch (error) {
    log.error('审计流程捕获错误:\n', error);
    process.exit(1)
  }
}
