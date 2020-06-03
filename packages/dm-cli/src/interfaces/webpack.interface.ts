import { IDepsGraph } from '../interfaces/deps-graph.interface'
import webpack = require('webpack');
import Watchpack = require('watchpack');
import IWebPackChain = require('webpack-chain');
export { IWebPackChain };

export { webpack as IWebpack }

export interface IAuditResult {
  name: string;
  data: ((string | number)[])[];
}

/** Compiler上挂载变量 */
export interface IWebpackCompilerExt extends webpack.Compiler {
  /** 记录编译文件时间戳，用于单文件watch */
  $oldFileTimestamps?: Map<string, number>;
  /** 挂载保存处理后的文件内容 */
  $fileCache?: Map<string, string>;
  /** 挂载依赖关系图 */
  $depsGraph?: IDepsGraph;
  /** 挂载审计结果 */
  $auditResult?: IAuditResult[];
  /** watch模式的watch系统 */
  watchFileSystem?: {
    watcher: Watchpack;
  };
}

/** 补充webpack Compilation类型缺失 */
export interface IWebpackCompilationExt extends webpack.compilation.Compilation {
  compiler: IWebpackCompilerExt;
  options?: webpack.Configuration;
}

/** 补充webpack  Module类型 */
export interface IWebpackModule{
  buildMeta: {
    /** es6模块提供的导出接口 */
    providedExports: boolean|string[];
  };
  /** es6模块被依赖的接口 */
  usedExports: boolean|string[];
  /** 模块文件路径 */
  resource: string;
}

export interface IWebpackError extends Error{
  details?: string;
}

export interface INMFBeforeResolveData {
  /** nmf上下文信息 */
  contextInfo: {
    /** 发起该模块请求的文件路径 */
    issuer: string;
    /** 编译实例 */
    compiler?: webpack.Compiler;
  };
  resolveOptions: object;
  /** 编译实例上下文 */
  context: string;
  /** 模块文件路径 */
  request: string;
  /** 模块导入语法的AST节点 */
  dependencies: any[];
}
