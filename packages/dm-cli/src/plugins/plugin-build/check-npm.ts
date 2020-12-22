
import { exec } from 'child_process';

import chalk from 'chalk';
import log from '../../common/log';
import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver'
import * as util from 'util';
import { IContext, ILooseObject } from '../../interfaces';
const execPromise = util.promisify(exec);

/**
   * 检查npm安装情况，若不匹配，返回需要安装的npm信息
   * @param prjRoot 项目根目录
   * @param dependencies 依赖的包
   */
function checkNpmVersion (prjRoot: string, dependencies: Record<string, string>): ILooseObject {
  log.log('检查npm包匹配情况');
  const npmInfo: ILooseObject = {}
  const shouldInstall: Record<string, string> = {}
  let lastNpmMtime = 0;
  for (const [npmName, npmVersion] of Object.entries(dependencies)) {
    const curPackageJSONPath = path.resolve(prjRoot, 'node_modules', ...npmName.split('/'), 'package.json');
    if (!fs.existsSync(curPackageJSONPath)) { // 没有安装npm包
      shouldInstall[npmName] = npmVersion as string;
    } else {
      lastNpmMtime = Math.max(lastNpmMtime, +new Date(fs.statSync(curPackageJSONPath).mtime))
      const curPackageJSON = JSON.parse(fs.readFileSync(curPackageJSONPath, 'utf8'));
      const curVersion = curPackageJSON.version;
      if (semver.ltr(curVersion, npmVersion as string) || semver.gtr(curVersion, npmVersion as string)) { // 版本不匹配
        shouldInstall[npmName] = npmVersion as string;
      }
    }
  }
  npmInfo.shouldInstall = shouldInstall;
  npmInfo.lastNpmMtime = lastNpmMtime;
  return npmInfo;
}

function adaptNpm (root: string): void {
  let paths = [];
  const baseRoot = path.resolve(root, 'node_modules', '@base')
  try {
    paths = fs.readdirSync(baseRoot);
  } catch (error) {
    return;
  }
  paths.forEach(p => {
    // 基础包路径
    const basePkg = path.resolve(baseRoot, p)
    // log.log('找到基础包:', basePkg);
    // 适配的文件名
    const adaptFileName = `${p}.wxapp.js`;

    // 适配的文件路径
    const adaptFilePath = path.resolve(basePkg, adaptFileName);
    if (fs.existsSync(adaptFilePath)) {
      const pkgJsonPath = path.resolve(basePkg, `package.json`);
      // eslint-disable-next-line
      const pkgJson = require(pkgJsonPath);
      if (pkgJson.main !== adaptFileName) {
        pkgJson.main = adaptFileName;
        fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2))
        log.log(`基础库小程序适配`, path.basename(root) + pkgJsonPath.replace(root, '').replace(path.sep + 'package.json', ''))
      }
    } else {
      // log.log(`当前包${basePkg}不需要适配`)
    }

    adaptNpm(path.resolve(basePkg));
  })
}
/**
 * 检查npm环境
 */
async function checkNpm (ctx: IContext): Promise<boolean> {
  log.start('检查npm包');
  const cwd = ctx.cwd;
  const dependencies = ctx.npmDeps;
  if (Object.keys(dependencies).length === 0) {
    log.log('当前项目没有package.json文件或者没有dependencies依赖，将跳过此步骤。');
    return false;
  }

  // 1、检查项目package.json的依赖与node_modules匹配情况
  const { shouldInstall, lastNpmMtime } = checkNpmVersion(cwd, dependencies);

  // 2、安装不匹配的包
  const shouldUpate = !!Object.keys(shouldInstall).length
  if (shouldUpate) {
    const npmInfo = Object.entries(shouldInstall).map(([npmName, npmVersion]) => `${npmName}@${npmVersion}`).join(' ');
    log.log(chalk.yellow(`需要更新包：${npmInfo}`));

    const installLog = await execPromise(`npm install ${npmInfo}  --registry=${ctx.opts.npm!.registry} -E`, { cwd });
    log.log('更新完成：\n', installLog.stdout);
  }

  // 3、npm包小程序端适配
  adaptNpm(cwd);

  // 4、检查是否需要构建npm
  const shouldBuild = (): boolean => {
    const miniprogramDir = path.resolve(cwd, 'miniprogram_npm');

    // 没有miniprogram_npm目录
    if (!fs.existsSync(miniprogramDir)) {
      log.debug('miniprogram_npm不存在，需要构建npm')
      return true;
    }

    // miniprogram_npm 目录缺少 npm 包
    let lastMiniNpmMtime = 0
    for (const npmName of Object.keys(dependencies)) {
      const miniNpmPath = path.resolve(miniprogramDir, ...npmName.split('/'), 'index.js');
      if (!fs.existsSync(miniNpmPath)) {
        log.debug(`miniprogram_npm缺少npm：${npmName} 需要重新构建npm`);
        return true;
      }
      lastMiniNpmMtime = Math.max(lastMiniNpmMtime, +new Date(fs.statSync(miniNpmPath).mtime))
    }

    // miniprogram_npm 的修改时间 晚于 node_modules 修改时间
    if (lastMiniNpmMtime < lastNpmMtime) {
      log.debug(`node_modules下npm包修改时间 ${lastNpmMtime} 比miniprogram_npm下npm包修改时间 ${lastMiniNpmMtime} 晚，需要重新构建npm`);
      return true;
    }
    return false
  }
  if (shouldUpate || shouldBuild()) {
    log.log('需要构建npm');
    return true;
  } else {
    log.log('当前项目已构建过npm，不再构建')
  }
  return false;
}

export {
  checkNpm
}
