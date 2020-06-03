/**
 * @description webpack编译打包
 */
import { Entry } from './entry';
import { Compiler } from './compiler';
import { WebpackConfig } from './webpack-config';
import { IContext, IWebpack } from '../../../interfaces';

export async function pack (ctx: IContext): Promise<void> {
  const webpackConfig: IWebpack.Configuration = new WebpackConfig(ctx).config;

  const entry = new Entry(ctx, webpackConfig)
  entry.generate();

  const compiler = new Compiler(ctx, webpackConfig);
  ctx.log.start('分析依赖');
  if (ctx.opts.watch) {
    await compiler.watch();
  } else {
    await compiler.build();
    entry.delete()
  }
}
