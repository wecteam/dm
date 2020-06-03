import { exec } from 'child_process';
import { IContext } from '../interfaces';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import log from './log';
import inquirer = require('inquirer');

const execPromise = util.promisify(exec);

const MSG_PORT_DISABLE = '需要打开微信开发者工具 -> 设置 -> 安全设置，将服务端口开启。';
const MSG_NEED_LOGIN = '需要重新扫码 登录 微信开发者工具。';
const MSG_NEED_WXCLI = '需要指定微信开发者工具cli安装路径，详见readme';
const MSG_WXCLI_404 = '当前指定的微信开发者工具cli路径不存在，详见readme，建议使用 dm config 重新配置';
const MSG_CONFIGFILE_404 = '微信开发者工具cli执行目录缺少 project.config.json文件';

/**
 * 调用cli需要project.config.json文件，使用开发者工具打开目录时会自动生成project.config.json，但build过程没有此文件，考虑自动生成一个
 * @param ctx
 * @projectPath 要执行微信cli的工程目录
 */
const checkCfgFile = (ctx: IContext, projectPath: string): void => {
  const cfgName = 'project.config.json';
  const dist = projectPath;
  // 优先使用目标目录配置文件
  const distCfgPath = path.resolve(dist, cfgName);
  if (fs.existsSync(distCfgPath)) return;
  if (!fs.existsSync(dist)) fs.mkdirSync(dist);

  // 其次取源码目录配置文件
  const cwdCfgPath = path.resolve(ctx.cwd, cfgName);
  if (fs.existsSync(cwdCfgPath)) {
    fs.writeFileSync(distCfgPath, fs.readFileSync(cwdCfgPath, 'utf8'));
    return;
  }

  // 最后取配置项生成配置文件
  let projectname = ctx.opts.projectname || '';
  let appid = ctx.opts.appid || '';

  // 指定app
  if (ctx.opts.app && ctx.opts.appMap && ctx.opts.appMap[ctx.opts.app]) {
    const appMap = ctx.opts.appMap[ctx.opts.app];
    projectname = appMap.projectname;
    appid = appMap.appid;
  }
  let cfgStr = fs.readFileSync(path.resolve(__dirname, '../../templates', cfgName), 'utf8');
  cfgStr = cfgStr.replace(/{appid}/g, appid).replace(/{projectname}/g, projectname);
  fs.writeFileSync(distCfgPath, cfgStr);
}

/**
 * 检查微信开发者工具cli路径，并判断当前环境是新版还是旧版
 * @param ctx
 */
const checkWxcliPath = (ctx: IContext): 'v1'|'v2' => {
  const opts = ctx.opts;
  if (!opts.wxcli) {
    throw MSG_NEED_WXCLI
  }

  if (!fs.existsSync(opts.wxcli)) {
    throw MSG_WXCLI_404
  }

  const v2DateMs = new Date('2020/03/09').getTime(); // 自 1.02.202003092 CLI & HTTP 接口升级 v2 版本

  const wxcliBirthtime = new Date(fs.statSync(opts.wxcli).birthtime).getTime(); // birthtime为命令行工具创建时间，与发版时间相同

  return wxcliBirthtime > v2DateMs ? 'v2' : 'v1'
}

/**
 * 检查调用cli需要依赖的环境
 * @param ctx
 * @projectPath 要执行微信cli的工程目录
 */
const checkWxcliEnv = (ctx: IContext, projectPath: string): {cliversion: 'v1'|'v2'} => {
  checkCfgFile(ctx, projectPath);
  const cliversion = checkWxcliPath(ctx);
  log.log(`当前微信开发者工具cli版本:${chalk.green(cliversion)}`)
  return {
    cliversion
  }
}

/**
 * 统一处理exec回调日志，注意此处为可预知错误，应抛出字符串，而不是Error
 */
const handleSuccess = (execLog: {stdout: string; stderr: string}, cliverion: 'v1'|'v2', msg: string): void => {
  const { stdout, stderr } = execLog
  if (cliverion === 'v1') {
    if (stderr) { // win系统exec执行微信cli命令时回调函数不会返回error，错误信息会打入stderror
      if (stderr.includes('服务端口已关闭') || stderr.includes('service port disabled')) {
        throw MSG_PORT_DISABLE
      }
      if (stderr.includes('重新登录')) {
        throw MSG_NEED_LOGIN
      }
      throw stderr
    } else {
      log.log(stdout);
      log.log(msg);
    }
  } else { // v2
    if (stderr.includes('port timeout')) { // 实际只有win系统会走到这里，mac系统会走到handleError
      throw MSG_PORT_DISABLE;
    }

    if (stdout.includes('error') && stdout.includes('重新登录')) { // 新版，未登录时，win和mac都不会抛出异常，未登录信息会输出到stdout
      throw MSG_NEED_LOGIN;
    }

    if (stdout.includes('error') && stdout.includes('project.config.json')) {
      throw MSG_CONFIGFILE_404;
    }

    log.log(stdout);
  }
}

/**
 * 处理错误
 */
const handleError = (error: any, cliverion: 'v1'|'v2'): void => {
  if (typeof error === 'string') throw error; // string认为是handleSuccess抛出的错误，不再处理

  const { message, code } = error;

  if (cliverion === 'v1') {
    if (message.includes('服务端口已关闭') || message.includes('service port disabled')) {
      throw MSG_PORT_DISABLE
    }
    if (message.includes('重新登录')) {
      throw MSG_NEED_LOGIN
    }
    throw error
  } else { // v2
    if (message.includes('port timeout') || code === 255) { // 实际只有mac系统会走到这里，win系统会走到handleSuccess
      throw MSG_PORT_DISABLE;
    } else {
      throw error
    }
  }
}

/**
 * 调用微信cli构建npm
 */
const buildNpm = async function (ctx: IContext): Promise<void> {
  log.start('构建npm')
  const projectPath = ctx.cwd;// 注意npm构建是在当前项目目录
  const { cliversion } = checkWxcliEnv(ctx, projectPath);

  let cmdStr = `"${ctx.opts.wxcli}"`; // cli及路径加上引号，避免win系统路径问题
  if (cliversion === 'v1') {
    cmdStr += ` --build-npm "${projectPath}"`
  } else {
    cmdStr += ` build-npm --project "${projectPath}"`
  }
  try {
    log.debug(cmdStr)
    const execLog = await execPromise(cmdStr);
    handleSuccess(execLog, cliversion, '构建npm成功');
  } catch (error) {
    handleError(error, cliversion) // win系统实际不会走到Erroe
  }
}

const open = async function (ctx: IContext): Promise<void> {
  log.start('启动开发者工具');
  const projectPath = ctx.dist
  const { cliversion } = checkWxcliEnv(ctx, projectPath);

  let cmdStr = `"${ctx.opts.wxcli}"`;
  if (cliversion === 'v1') {
    cmdStr += ` -o "${projectPath}"`
  } else {
    cmdStr += ` open --project "${projectPath}"`
  }
  try {
    log.debug(cmdStr)
    const execLog = await execPromise(cmdStr);
    handleSuccess(execLog, cliversion, '已启动');
  } catch (error) {
    handleError(error, cliversion);
  }
}

const preview = async (ctx: IContext): Promise<void> => {
  log.start('预览');
  const projectPath = ctx.dist;
  const { cliversion } = checkWxcliEnv(ctx, projectPath);

  let { qrFormat, infoOutput } = ctx.opts;
  const { qrOutput, compileCondition } = ctx.opts;

  if (qrOutput) { // 指定二维码输出路径时，需要指定一个非terminal的format值
    if (!qrFormat) {
      qrFormat = 'base64';
    }
  }

  if (!infoOutput) {
    infoOutput = path.resolve(projectPath, 'preview-info.json');
  }

  let cmdStr = `"${ctx.opts.wxcli}"`

  if (cliversion === 'v1') {
    cmdStr += ` --preview "${projectPath}" --preview-info-output "${infoOutput}"`
    qrOutput && (cmdStr += ` --preview-qr-output "${qrFormat}@${qrOutput}"`)
  } else {
    cmdStr += ` preview --project "${projectPath}" --info-output "${infoOutput}"`
    qrOutput && (cmdStr += ` --qr-format ${qrFormat} --qr-output "${qrOutput}"`)
  }

  if (compileCondition) {
    if (os.type() === 'Windows_NT') { // win系统不能使用compile-condition参数。部分ide集成的终端无法显示二维码
      log.warn(`windows系统暂不支持传递启动参数，将忽略:${compileCondition}`)
    } else {
      cmdStr += ` --compile-condition '${compileCondition}'`
    }
  }

  log.start('开始生成二维码');

  try {
    log.debug(cmdStr)
    const execLog = await execPromise(cmdStr);
    handleSuccess(execLog, cliversion, chalk.green('preview结束'));
  } catch (error) {
    handleError(error, cliversion);
  }
  log.done();
}

const upload = async (ctx: IContext): Promise<void> => {
  const projectPath = ctx.dist;
  const { cliversion } = checkWxcliEnv(ctx, projectPath);
  let { version, desc, infoOutput } = ctx.opts;
  if (!version) {
    const versionAnwser = await inquirer.prompt([{
      type: 'input',
      name: 'version',
      message: `请输入版本号`,
      validate: (input): boolean => Boolean(input && input.trim())
    }]);
    version = versionAnwser.version;
  }

  if (!desc) {
    const descAnwser = await inquirer.prompt([{
      type: 'input',
      name: 'desc',
      message: `请输入版本描述`,
      validate: (input): boolean => Boolean(input && input.trim())
    }]);
    desc = descAnwser.desc;
  }

  if (infoOutput) {
    infoOutput = path.resolve(projectPath, 'upload-info.json');
  }

  let cmdStr = `"${ctx.opts.wxcli}"`

  if (cliversion === 'v1') {
    cmdStr += ` --upload "${version}@${projectPath}" --upload-desc "${desc}" --upload-info-output "${infoOutput}"`
  } else {
    cmdStr += ` upload --project "${projectPath}" --version ${version} --desc ${desc}  --info-output "${infoOutput}"`;
  }

  log.start('开始上传');

  try {
    log.debug(cmdStr)
    const execLog = await execPromise(cmdStr);
    handleSuccess(execLog, cliversion, chalk.green('上传结束'));
  } catch (error) {
    handleError(error, cliversion);
  }
  log.done();
}

export {
  open,
  buildNpm,
  preview,
  upload
}
