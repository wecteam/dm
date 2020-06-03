import { Context } from '../impl/context.impl';
import { IUploadOpts, IOpts } from '../interfaces';

export async function upload (uploadOpts?: IUploadOpts): Promise<void> {
  const opts: IOpts = { action: 'upload', ...uploadOpts }
  const ctx = Context.getInstance(opts);
  const log = ctx.log;
  const uploadHooks = ctx.hooks.upload;
  try {
    await uploadHooks.beforeRun.promise();

    await uploadHooks.run.promise();

    await uploadHooks.done.promise();
  } catch (error) {
    log.error('上传流程捕获错误:\n', error);
    process.exit(1)
  }
}
