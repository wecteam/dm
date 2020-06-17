/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable no-new */
import { IOpts, ILooseObject } from '../interfaces';
import { homeConfigPath } from '../processes/config';
import { AsyncSeriesHook, AsyncParallelHook } from 'tapable';
import * as utils from '../common/utils';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import log from '../common/log';
import Config = require('webpack-chain');
import webpack = require('webpack');
import gulp = require('gulp')

class AsyncSeriesDataHook extends AsyncSeriesHook {
  /** 用于存储钩子执行后的数据 */
  public data = {} as ILooseObject
}
class AsyncParallelDataHook extends AsyncParallelHook {
  /** 用于存储钩子执行后的数据 */
  public data = {} as ILooseObject
}

class Opts {
  private static opts: IOpts;
  public static getOpts (cwd: string): IOpts {
    if (this.opts) return this.opts;

    const defaultOpts: IOpts = {
      action: 'build',
      wxcli: os.type() === 'Windows_NT' ? '' : '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
      output: {
        build: path.resolve(cwd, '../dm-build'),
        preview: path.resolve(cwd, '../dm-build'),
        upload: path.resolve(cwd, '../dm-build'),
        audit: path.resolve(cwd, '../dm-audit')
      },
      npm: {
        maxRefer: 3
      },
      plugins: [
        [require.resolve('../plugins/plugin-build/index'), {}], // 内置插件-编译相关，包含各基本文件类型的loader及依赖分析插件
        [require.resolve('../plugins/plugin-audit/index'), {}], // 内置插件-审计相关
        [require.resolve('../plugins/plugin-new/index'), {}], // 内置插件-新增相关
        [require.resolve('../plugins/plugin-preview/index'), {}], // 内置插件-预览相关
        [require.resolve('../plugins/plugin-upload/index'), {}], // 内置插件-上传相关
        [require.resolve('../plugins/plugin-optimize/index'), {}] // 内置插件-优化相关，包含js、css tree-shaking
      ]
    };

    // 优先级：默认配置<全局配置<项目配置<用户配置
    [defaultOpts,
      ...[homeConfigPath, path.resolve(cwd, 'dm.config.js'), path.resolve(cwd, 'dm.config.profile.js')].map(p => fs.existsSync(p) ? require(p) : {})
    ].reduce(utils.deepMerge);

    this.opts = defaultOpts;

    return defaultOpts
  }
  public static formatOpts (opts: IOpts): IOpts {
    const { page } = opts;
    if (page) {
      opts.page = Array.isArray(page) ? page : page.split(',')
    }
    return opts;
  }
}

export class Context {
  /** 单例 */
  private static instance?: Context;
  /** 日志模块 */
  public log = log;
  /** 工具模块 */
  public utils = utils;
  /** 流程钩子函数 */
  public hooks = {
    /** build命令钩子 */
    build: {
      /** 版本检查：cli版本、node版本、操作系统等 */
      version: new AsyncSeriesDataHook(),
      /** 环境检查：命令执行环境等 */
      env: new AsyncSeriesDataHook(),
      /** 编译打包前：做一些预处理的事情 */
      beforePack: new AsyncSeriesDataHook(),
      /** 编译打包：TODO 替换pack流程 */
      pack: new AsyncSeriesDataHook(),
      /** 编译打包后：并行钩子，做一些拷贝、文件修改类动作 */
      afterPack: new AsyncParallelDataHook(),
      /** 发布：压缩类处理 */
      release: new AsyncSeriesDataHook(),
      /** 流程结束 */
      done: new AsyncSeriesDataHook()
    },
    /** new命令钩子 */
    new: {
      beforeRun: new AsyncSeriesDataHook(),
      run: new AsyncSeriesDataHook(),
      done: new AsyncSeriesDataHook()
    },
    /** audit 命令钩子 */
    audit: {
      beforeRun: new AsyncSeriesDataHook(),
      run: new AsyncSeriesDataHook(),
      done: new AsyncSeriesDataHook()
    },
    /** preview 命令钩子 */
    preview: {
      beforeRun: new AsyncSeriesDataHook(),
      run: new AsyncSeriesDataHook(),
      done: new AsyncSeriesDataHook()
    },
    /** uoload 命令钩子 */
    upload: {
      beforeRun: new AsyncSeriesDataHook(),
      run: new AsyncSeriesDataHook(),
      done: new AsyncSeriesDataHook()
    }
  }
  /** gulp api */
  public gulp = gulp;
  /** webpack api */
  public webpack = webpack;
  /** webpack-chain */
  public config = new Config();
  /** 当前工作目录，/User/xxx/app */
  public cwd: string;
  /** 配置项 */
  public opts: IOpts;
  /** 目标目录 */
  public dist: string;
  /** 当前项目npm依赖，即根目录下 package.json 中的 dependencies 字段 */
  public npmDeps: Record<string, string>;
  /** 临时数据 */
  private tempData: ILooseObject ={};

  private constructor (opts: IOpts) {
    this.cwd = opts.cwd ? path.resolve(opts.cwd) : process.cwd();
    this.opts = this.mergeOpts(opts);
    this.dist = this.getDist();
    this.npmDeps = this.getNpmDeps();
    Context.getPlugins(this.cwd, (Clazz, opts) => {
      new Clazz(this, opts)
    });
  }

  public static getInstance (opts?: IOpts): Context {
    if (!this.instance) {
      if (!opts) throw new Error('首次初始化Context没有传递参数')
      this.instance = new Context(opts);
    }
    return this.instance;
  }
  /** 连续调用api时可能会用到 */
  public static destoryInstance (): void {
    this.instance = undefined;
  }

  /** 获取插件，用于提前获取插件中的cmdHooks */
  public static getPlugins (cwd: string, callback: (Clazz: any, params: ILooseObject) => void): void {
    const opts = Opts.getOpts(cwd)
    try {
      opts.plugins!.forEach(plugin => {
        if (Array.isArray(plugin)) {
          const [pluginPath, params = {}] = plugin;
          const Plugin = require(pluginPath) // TODO 配置文件中的npm包目前需要使用require.resolve('mod')转换
          callback(Plugin, params)
        } else {
          const Plugin = require(plugin)
          callback(Plugin, {})
        }
      })
    } catch (error) {
      log.error('初始化配置出错');
      log.error(error);
      process.exit(1)
    }
  }

  /** 暂存临时数据 */
  public setTempData<T> (key: string, value: T): void {
    this.tempData[key] = value
  }
  /** 获取临时数据 */
  public getTempData<T> (key: string): T {
    return this.tempData[key]
  }
  /** 优先级：默认配置<全局配置<项目配置<用户配置<命令行配置 */
  private mergeOpts (opts: IOpts): IOpts {
    // 默认配置
    const defaultOpts = Opts.getOpts(this.cwd);
    utils.deepMerge(defaultOpts, opts);

    Opts.formatOpts(defaultOpts);
    return defaultOpts
  }

  private getDist (): string {
    let distPath = this.opts.output![this.opts.action] || ''; // this.opts.output有默认值
    if (this.opts.app) {
      distPath += `-${this.opts.app}`;
    }
    if (this.opts.type) {
      distPath += `-${this.opts.type}`;
    }
    return distPath;
  }

  /** 获取项目npm依赖 */
  private getNpmDeps (): Record<string, string> {
    const npmDeps: Record<string, string> = {}
    const prjPackageJSONPath = path.resolve(this.cwd, 'package.json');
    if (!fs.existsSync(prjPackageJSONPath)) {
      return npmDeps;
    }

    const prjPackageJSON = JSON.parse(fs.readFileSync(prjPackageJSONPath, 'utf8'));
    const dependencies = prjPackageJSON.dependencies;
    if (!dependencies || Object.keys(dependencies).length === 0) {
      return npmDeps;
    } else {
      return dependencies
    }
  }
}
