import { IContext, ILooseObject } from '../../interfaces';
import { checkNpm } from './check-npm';
import { open, buildNpm } from '../../common/wxapp-cli';
import { copyResource } from './copy-resource';
import { pack } from './pack';
import * as path from 'path';
import DepsPlugin from './webpack-plugins/deps-plugin';
import WatchSinglePlugin from './webpack-plugins/watch-single-plugin';
import NpmPlugin from './webpack-plugins/npm-plugin';
import CleanWebpackPlugin = require('clean-webpack-plugin');

class DmPluginBuild {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params || {};
    this.initHooks();
    this.configWebpackPlugins();
    this.configWebpackRules();
    this.configOptimization();
  }
  initHooks (): void {
    const buildHooks = this.ctx.hooks.build;
    const log = this.ctx.log;

    buildHooks.env.tapPromise('DmPluginBuild-checkEnv', async () => {
      this.ctx.utils.checkEnv(this.ctx);
    })

    buildHooks.env.tapPromise('DmPluginBuild-checkNpm', async () => {
      buildHooks.env.data.shouldBuildNpm = await checkNpm(this.ctx);
    })

    // 构建npm动作单独拉出来，可被替换
    buildHooks.env.tapPromise('DmPluginBuild-buildNpm', async () => {
      if (buildHooks.env.data.shouldBuildNpm) {
        await buildNpm(this.ctx);
      }
    })

    buildHooks.pack.tapPromise('DmPluginBuild-pack', async () => {
      await pack(this.ctx);
    })

    buildHooks.afterPack.tapPromise('DmPluginBuild-copyResource', async () => {
      log.debug('start copyResource')
      await copyResource(this.ctx);
      log.debug('end copyResource')
    })

    buildHooks.done.tapPromise('DmPluginBuild-open', async () => {
      if (this.ctx.opts.open) {
        await open(this.ctx)
      }
    })
  }

  configWebpackPlugins (): void {
    const ctx = this.ctx;
    const cwd = ctx.cwd;
    const distPath = ctx.dist;
    const config = ctx.config;

    config
      .plugin('CleanWebpackPlugin')
      .use(CleanWebpackPlugin, [[distPath], {
        verbose: false,
        root: path.resolve(cwd, '../'),
        exclude: ['project.config.json']
      }]).end()

      .plugin('DepsPlugin').use(DepsPlugin, [ctx]).end()
      .plugin('NpmPlugin').use(NpmPlugin, [ctx]).end(); // npm包支持

    if (ctx.opts.watch) {
      config
        .plugin('WatchSinglePlugin')
        .use(WatchSinglePlugin, [ctx]).end()
    }
  }
  configWebpackRules (): void {
    const ctx = this.ctx;
    const { app, type } = ctx.opts; // 上下文里的app参数
    const config = ctx.config;

    config.module
      .rule('js').test(/\.js$/)
      .use('ifelse-loader').loader('ifelse-loader').options({
        fileType: 'js',
        type,
        app
      }).end()

    config.module
      .rule('wxml').test(/\.wxml$/)
      .use('wxml-loader').loader('wxml-loader').end()
      .use('ifelse-loader').loader('ifelse-loader').options({ fileType: 'wxml', app, type }).end()

    config.module
      .rule('wxss').test(/\.wxss$/)

      .use('wxss-loader').loader('wxss-loader').options({
        sassSuffix: ctx.opts.sassSuffix // 页面实际维护的是css文件而不是wxss文件
      }).end()

      .use('ifelse-loader').loader('ifelse-loader').options({ fileType: 'wxss', app, type }).end()

    config.module
      .rule('wxs').test(/\.wxs$/)
      .use('wxs-loader').loader('wxs-loader').end()
      .use('ifelse-loader').loader('ifelse-loader').options({ fileType: 'wxs', app, type }).end()

    config.module
      .rule('json').test(/\.json$/).type('javascript/auto')
      .use('wxjson-loader').loader('wxjson-loader').options({ ctx }).end()
      .use('ifelse-loader').loader('ifelse-loader').options({ fileType: 'json', app, type }).end()

    config.resolveLoader.modules
      .add('node_modules')
      .prepend(path.resolve(__dirname, 'webpack-loaders'))
  }

  configOptimization (): void{
    const config = this.ctx.config;
    config.optimization
      .providedExports(true)
      .usedExports(true);
  }
}

export = DmPluginBuild
