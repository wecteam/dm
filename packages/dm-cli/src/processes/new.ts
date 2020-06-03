import { Context } from '../impl/context.impl';
import { INewOpts, IOpts } from '../interfaces';

/**
 * 引导新建page或component
 */
export async function create (newOpts?: INewOpts): Promise<void> {
  const opts: IOpts = { action: 'new', ...newOpts }
  const ctx = Context.getInstance(opts);
  const log = ctx.log;
  const newHooks = ctx.hooks.new;
  try {
    await newHooks.beforeRun.promise();

    await newHooks.run.promise();

    await newHooks.done.promise();
  } catch (error) {
    log.error('新增流程捕获错误:\n', error);
    process.exit(1)
  }
}
