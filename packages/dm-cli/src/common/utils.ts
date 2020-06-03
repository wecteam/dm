import { IContext, ILooseObject } from '../interfaces';
import { execSync } from 'child_process'
import log from './log';
import * as fs from 'fs';
import * as path from 'path';
import moment = require('moment');

/**
 * 根据.json文件中声明的usingComponents字段，获取要依赖的文件
 * @param {Object} ctx cli上下文
 * @param {Object} usingComponents json文件字段
 * @param {String} context 组件上下文
 */
export function getComponentsFiles (ctx: IContext, usingComponents: Record<string, string>, context: string): string[] {
  const npmDeps = ctx.npmDeps || {};
  const sassSuffix = ctx.opts.sassSuffix;
  const requires: string[] = [];
  Object.keys(usingComponents).forEach(name => {
    let componentPath = usingComponents[name];
    const fpl = componentPath[0]; // 组件路径第一个字母
    if (componentPath.startsWith('plugin://') || npmDeps[componentPath]) return; // plugin与npm包不处理
    if (fpl === '/') {
      componentPath = path.resolve(ctx.cwd, componentPath.substr(1)).replace(/\\/g, '/');
    } else if (fpl !== '.') {
      componentPath = './' + componentPath;
    }

    requires.push(`require('${componentPath}');`);
    requires.push(`require('${componentPath}.wxml');`);
    requires.push(`require('${componentPath}.json');`);
    const absComponentPath = path.resolve(context, `${componentPath}`) // 文件绝对路径，win下并不能用于require
    if (fs.existsSync(`${absComponentPath}.${sassSuffix}`)) { // .undefined
      requires.push(`require('${componentPath}.${sassSuffix}');`);
    } else if (fs.existsSync(`${absComponentPath}.wxss`)) {
      requires.push(`require('${componentPath}.wxss');`);
    }
  });
  return requires;
}

/** 检查是否符合小程序目录结构 */
export function checkEnv (ctx: IContext): void {
  ctx.log.start('检查环境');
  const appJsPath = path.resolve(ctx.cwd, 'app.js');
  const appJson = path.resolve(ctx.cwd, 'app.json');
  if (!(fs.existsSync(appJsPath) && fs.existsSync(appJson))) {
    throw `当前目录 ${ctx.cwd} 没有找到app.js或app.json文件，请先切换到小程序根目录再执行命令`;
  }
}

/** 深度合并 */
export function deepMerge (target: ILooseObject, source: ILooseObject): ILooseObject {
  if (toString.call(target) === '[object Object]' && toString.call(source) === '[object Object]') {
    for (const key in source) {
      if (!target[key]) {
        target[key] = source[key];
      } else {
        target[key] = deepMerge(target[key], source[key]);// 递归赋值
      }
    }
  } else if (toString.call(target) === '[object Array]' && toString.call(source) === '[object Array]') {
    // 数组进行合并
    target = target.concat(source);
  } else {
    target = source;
  }
  return target;
}

/**
 * 获取文件最后一次提交信息
 * @param {String} filePath 文件相对根目录路径
 */
export function getLastCommitInfo (filePath: string): {
  path: string;
  commit: string;
  author: string;
  dateStr: string;
} {
  const defaultResult = {
    path: filePath,
    commit: '',
    author: '',
    dateStr: ''
  };
  if (/^\./.test(filePath)) {
    return defaultResult;
  }
  try {
    const str1 = execSync(`git log '${filePath}'`, { encoding: 'utf8' });
    if (str1) {
      const commit = /commit\s+(.*)\n/.exec(str1) || [];
      const Author = /Author:\s+(.*)\n/.exec(str1) || [];
      const DateStr = /Date:\s+(.*)\n/.exec(str1) || [];
      const formateDate = DateStr[1] ? moment(new Date(DateStr[1])).format('YYYY-MM-DD HH:mm:ss') : '';
      return {
        path: filePath,
        commit: commit[1] || '',
        author: Author[1] || '',
        dateStr: formateDate
      };
    } else {
      return defaultResult;
    }
  } catch (err) {
    log.debug(`error in:(${filePath}),获取commit信息失败`);
    log.debug(err);
    return defaultResult;
  }
}

/** 每一行的修改信息 */
export function getBlameInfo (filePath: string, startLine = 1, endLine: number): Record<number, string> {
  const authors: Record<number, string> = {};
  try {
    const blameInfoStr = execSync(`git blame '${filePath}' --line-porcelain -L ${startLine},${endLine}`, { encoding: 'utf8' });
    if (blameInfoStr) {
      let num = startLine;
      const reg = /author\s+(.+)\n/g;
      let regResult = reg.exec(blameInfoStr);
      while (regResult) {
        authors[num++] = regResult[1];
        regResult = reg.exec(blameInfoStr);
      }
      return authors;
    } else {
      return authors;
    }
  } catch (err) {
    log.debug(`error in:(${filePath}),获取commit信息失败`);
    log.debug(err);
    return authors;
  }
}
