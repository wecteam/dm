import { IWebpackCompilerExt, IContext, IWebpackCompilationExt, INMFBeforeResolveData, IWebpack, IWebpackModule, ILooseObject } from '../../../interfaces';
import { DepsGraph, NpmVexNode, FileVexNode, VarVexNode } from '../../../impl/deps-graph.impl'
import * as fs from 'fs';
import * as path from 'path';
import log from '../../../common/log';
import chalk from 'chalk';
import moment = require('moment');

class DepsPlugin {
  compiler?: IWebpackCompilerExt;
  ctx: IContext;
  options: ILooseObject;
  constructor (ctx: IContext, options?: ILooseObject) {
    this.ctx = ctx;
    this.options = options || {}
  }
  apply (compiler: IWebpackCompilerExt): void {
    this.compiler = compiler;
    log.debug('deps-plugin apply');
    // 初始化compiler挂载对象
    compiler.hooks.entryOption.tap('DepsPlugin', () => {
      compiler.$fileCache = new Map();
      compiler.$depsGraph = new DepsGraph();
      log.debug('配置文件初始化完成');
    })

    /** 每次watch触发编译时都是同一个compiler对象，此处处理需要重置的对象 */
    compiler.hooks.watchRun.tap('DepsPlugin', () => {
      log.log(`${moment().format('HH:mm:ss')} watch building...`);
      compiler.$depsGraph = new DepsGraph();
    })

    compiler.hooks.normalModuleFactory.tap('DepsPlugin', (nmf) => {
      log.debug('创建 DepsPlugin Module');
      const npmDeps = this.ctx.npmDeps;
      const entry = compiler.options.entry as string;
      const ignoreRequest = this.options.ignoreRequest as RegExp[] || [];

      const isIgnore = (rules: RegExp[], target: string): boolean => {
        for (const rule of rules) {
          if (rule.test(target)) return true;
        }
        return false
      }

      nmf.hooks.beforeResolve.tap('DepsPlugin', (data: INMFBeforeResolveData) => {
        const dataRequest = data.request;
        let isNpm = false;
        switch (true) {
          // 相对路径不干预
          case dataRequest.startsWith('.'):
            break;

          // 已转成绝对路径的不再处理，wxml、wxss、wxjson中的依赖都会先在loader中做转换  注意win环境路径处理
          case dataRequest.replace(/\\/g, '/').indexOf(compiler.context.replace(/\\/g, '/')) !== -1:
            break;

          // 项目npm包依赖不处理，记录npm依赖用于动态
          case !!npmDeps[dataRequest]:
            isNpm = true;
            data.request = entry; // 直接处理成entry，不纳入依赖图中
            break;

          // 忽略特定请求，主要是动态require('@wecteam/xx')的场景
          case isIgnore(ignoreRequest, dataRequest):
            data.request = entry;
            break;

          // 忽略模块化相关依赖，部分机器会出现：~@wecteam/dm-cli/node_modules/webpack/buildin/module.js 等
          case /[/\\]node_modules[/\\]/.test(dataRequest):
            data.request = entry;
            break;

          // 剩余的都转成相对依赖
          // 1、require('common/biz.js') 处理成require('./common/biz.js')
          // 2、require('/common/biz.js') 处理成require('./common/biz.js'),注意js的绝对路径要转成相对路径，wxss、wxml、组件的绝对路径，要转成小程序根目录，已在loader中处理
          default:
            data.request = './' + dataRequest;
            break;
        }

        // 记录依赖
        this.recordDeps(data, isNpm)
      })
    })

    compiler.hooks.emit.tap('DepsPlugin', (compilation: IWebpackCompilationExt) => {
      log.debug('DepsPlugin 生成资源到 output 目录之前 hooks', compilation.compiler.outputPath);
      const options = compilation.options!

      // app.json直接读取,不走loader
      compilation.assets['app.json'] = {
        source: (): string => {
          return JSON.stringify(this.ctx.getTempData('appJSON'), null, 4)
        },
        size: (): number => {
          return 100;
        }
      };

      // 其他chunk
      log.debug('blue', chalk.blue('开始处理 chunk ……'));
      const sourceDir = options.context + path.sep;
      const sassSuffixReg = new RegExp(`\\.${this.ctx.opts.sassSuffix}$`)
      compilation.chunks.forEach((chunk: IWebpack.compilation.Chunk) => {
        for (const WPModule of chunk.modulesIterable as IWebpackModule[]) {
          const resource = WPModule.resource;

          if (!resource) continue; // require(prefix+'name')动态场景

          if (/[/\\]node_modules[/\\]/.test(resource)) continue; // /Users/xxx/@wecteam/dm-cli/node_modules/webpack/buildin/module.js

          const distDir = resource.replace(sourceDir, '').replace(sassSuffixReg, '.wxss');

          const code = this.getFileContent(resource);

          compilation.assets[distDir] = {
            $module: WPModule, // 保存module信息供其他插件使用
            source: function (): string {
              return code;
            },
            size: function (): number {
              return code.length;
            }
          };
        }
      });

      // 删掉构建的入口
      delete compilation.assets[options.output!.filename as string]
      log.debug('blue', chalk.blue('chunk 处理完成'));
    });

    compiler.hooks.afterEmit.tap('DepsPlugin', (compilation: IWebpackCompilationExt) => {
      const recordFilesMap = compilation.compiler.$fileCache;
      const depsGraph = compiler!.$depsGraph!
      // 更新文件size
      recordFilesMap && recordFilesMap.forEach((value, key) => {
        const fileVexNode = depsGraph.getFileVexNode(key);
        if (fileVexNode) {
          fileVexNode.size = Buffer.from(value).length
        }
      });
    });
  }

  /**
   * 获取文件内容
   * @param path  文件绝对路径
   */
  getFileContent (path: string): string {
    const compiler = this.compiler!
    if (compiler.$fileCache!.has(path)) {
      return compiler.$fileCache!.get(path)!;
    } else {
      // 本地读取作为兜底
      return fs.readFileSync(path, 'utf8');
    }
  }

  /**
   * 记录包依赖
   * @param issuer 请求发起者
   * @param data normalModuleFactory上下文
   */
  recordNpmDep (issuer: string, data: INMFBeforeResolveData): void {
    const npmDepsAst = data.dependencies; // npm的导入及使用的语法结构
    if (!Array.isArray(npmDepsAst)) return;
    const fileVexNode = new FileVexNode(issuer);
    const recordMap: Record<string, boolean> = {}
    // 递归记录npm包内部的依赖
    const recordContentDep = (npmName: string): void => {
      if (recordMap[npmName]) return; // 防止循环依赖
      recordMap[npmName] = true;
      const npmPkgPath = path.resolve(this.ctx.cwd, 'node_modules', ...npmName.split('/'), 'package.json');

      if (!fs.existsSync(npmPkgPath)) {
        log.warn('没有找到npm包：', npmPkgPath);
        return;
      }
      const dependencies = JSON.parse(fs.readFileSync(npmPkgPath, 'utf8')).dependencies || {}
      Object.keys(dependencies).forEach(dep => {
        const npmVexNode = new NpmVexNode(dep);
        this.compiler!.$depsGraph!.addArc(fileVexNode, npmVexNode); // npm自身的依赖包也要作为issuer的依赖
        recordContentDep(dep)
      })
    }

    const npmName = npmDepsAst[0].request;
    log.debug('DepsPlugin recordPkgDep', npmName);

    const npmVexNode = new NpmVexNode(npmName);
    this.compiler!.$depsGraph!.addArc(fileVexNode, npmVexNode); // 文件 -> npm包
    recordContentDep(npmName)
  }

  /**
   * 记录文件依赖
   * @param issuer 请求发起者
   * @param targetPath 目标绝对路径
   * @param data normalModuleFactory上下文
   */
  recordFileDep (issuer: string, targetPath: string, data: INMFBeforeResolveData): void{
    const depType = data!.dependencies![0].type === 'cjs require' ? 'require' : 'import';
    const issuerFileVexNode = new FileVexNode(issuer);
    const targetFileVexNode = new FileVexNode(targetPath);
    this.compiler!.$depsGraph!.addArc(issuerFileVexNode, targetFileVexNode, depType); // 文件 -> 文件
  }
  /**
   * 记录变量依赖，即模块导出的函数、常量、类等
   * @param issuer 请求发起者
   * @param targetPath 目标绝对路径
   * @param data normalModuleFactory上下文
   */
  recordVarDep (issuer: string, targetPath: string, data: INMFBeforeResolveData): void{
    const varDepsAst = data.dependencies // 模块的导入及使用的语法结构
    // log.debug(varDepsAst, issuer, targetPath)
    // TODO 当使用 import * as mod from 'mod'，并使用了其所有变量，如log(mod)时，需要获取目标模块所有导出变量，需要在emit阶段才能拿到。
    // 1. varDepsAst[0]记录导入的语法，HarmonyImportSideEffectDependency代表import，CommonJsRequireDependency代表require
    // 2. 当varDepsAst[0]代表import时，varDepsAst[1~n]为HarmonyImportSpecifierDependency，代表变量调用。id记录具体使用的变量名。若id 为 null 代表使用了所有变量,id为default代表默认导入的使用
    // 3. 当varDepsAst[0]代表import时，若仅有导入，但未调用，则varDepsAst仅有一项
    // 4. 当varDepsAst[0]代表require时，由于无法分析变量使用情况，因此varDepsAst只有一项。
    // 5. 在emit阶段，能拿到详细的依赖信息，WPModule.reasons记录了其他模块对当前module的依赖情况，
    // 6. reasons.module能拿到issuer路径，reasons.dependency同varDepsAst，集合了所有issuer的varDepsAst
    const tailVex = new FileVexNode(issuer);
    const depsGraph = this.compiler!.$depsGraph!;
    let ids = varDepsAst.slice(1).map(item => item.id);
    ids = Array.from(new Set(ids)) // 去重
    ids.forEach(id => {
      if (!id) return; // TODO id为null代表使用了所有变量
      if (id === 'default') { // 默认导入，更新一下文件的导出类型
        const targetFileVex = depsGraph.getFileVexNode(targetPath);
        targetFileVex && (targetFileVex.exportType = 'exportDefault')
      } else {
        const headVex = new VarVexNode(id, targetPath);
        depsGraph.addArc(tailVex, headVex);
      }
    });
  }
  /**
   * 记录依赖关系
   * @param data normalModuleFactory上下文
   * @param isNpm 是否npm依赖
   */
  recordDeps (data: INMFBeforeResolveData, isNpm: boolean): void{
    const issuer = data.contextInfo.issuer;
    const entry = this.compiler!.options.entry;
    if (!issuer || issuer === entry) return;

    if (isNpm) {
      this.recordNpmDep(issuer, data);
    } else {
      let targetPath = path.resolve(data.context, data.request);
      if (!targetPath || targetPath === entry) return;
      if (!/\.(json|js|wxs|wxml|css|scss|wxss)$/.test(targetPath)) {
        targetPath += '.js';
      }
      this.recordFileDep(issuer, targetPath, data);
      if (path.extname(targetPath) === '.js') {
        this.recordVarDep(issuer, targetPath, data);
      };
    }
  }
}
export default DepsPlugin;
