import { Context } from '../impl/context.impl';
import { IPreviewOpts, IOpts } from '../interfaces';

export async function preview (previewOpts?: IPreviewOpts): Promise<void> {
  const opts: IOpts = { action: 'preview', ...previewOpts }
  const ctx = Context.getInstance(opts);
  const log = ctx.log;
  const previewHooks = ctx.hooks.preview;
  try {
    await previewHooks.beforeRun.promise();

    await previewHooks.run.promise();

    await previewHooks.done.promise();
  } catch (error) {
    log.error('预览流程捕获错误:\n', error);
    process.exit(1)
  }
}
