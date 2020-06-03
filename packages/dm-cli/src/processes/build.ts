import { Context } from '../impl/context.impl';
import { IBuildOpts, IOpts } from '../interfaces';
import chalk from 'chalk'

export async function build (buildOpts: IBuildOpts = {}): Promise<void> {
  const opts: IOpts = { action: 'build', ...buildOpts }
  const ctx = Context.getInstance(opts);
  const log = ctx.log;
  const buildHooks = ctx.hooks.build;
  try {
    log.debug(`依次执行 版本检查 事件钩子`);
    await buildHooks.version.promise();

    log.debug(`依次执行 环境检查 事件钩子`);
    await buildHooks.env.promise();

    log.debug(`依次执行 打包前 事件钩子`);
    await buildHooks.beforePack.promise();

    log.debug(`开始执行 打包`);
    await buildHooks.pack.promise();

    log.debug(`并行执行 打包后 事件钩子`);
    await buildHooks.afterPack.promise();

    log.debug(`依次执行 发布 事件钩子`);
    await buildHooks.release.promise(); // 发布钩子内部版由参数--release控制是否执行相关函数

    log.debug(`依次执行 结束 事件钩子`);
    await buildHooks.done.promise();

    log.start('构建结果');
    log.log(chalk.green('build success!'), ctx.opts.watch ? `已启动${chalk.green('watch...')}` : '', 'dist目录:', ctx.dist);
    log.done();
  } catch (error) {
    log.error('构建流程捕获错误:\n', error);
    process.exit(1)
  }
}
