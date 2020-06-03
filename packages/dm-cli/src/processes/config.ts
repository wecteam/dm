/* eslint-disable @typescript-eslint/no-var-requires */
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import chalk from 'chalk';
import log from '../common/log';

// 全局用户目录
const homeDir = path.resolve(os.homedir(), '.dm-cli');
// 全局用户配置路径
const homeConfigPath = path.resolve(homeDir, 'config.json');

const errMsg = '输入指令有误，请输入 dm help config 查看使用说明';

const checkDir = (): void => {
  if (!fs.existsSync(homeDir)) {
    fs.mkdirSync(homeDir);
  }
  if (!fs.existsSync(homeConfigPath)) {
    fs.writeFileSync(homeConfigPath, '{}')
  }
}

const list = (): string => {
  const rcJSON = require(homeConfigPath);
  return rcJSON;
}

const get = (key: string): string => {
  if (!key) {
    return list();
  }
  const rcJSON = require(homeConfigPath)
  return rcJSON[key]
}

const set = (key: string, val: string): string => {
  if (!key || !val) {
    return chalk.red(errMsg);
  }
  const rcJSON = require(homeConfigPath);
  rcJSON[key] = val;
  fs.writeFileSync(homeConfigPath, JSON.stringify(rcJSON, null, 2));
  return chalk.green(`设置成功：${key}=${val}`)
}

const deleteKey = (key: string): string => {
  if (!key) {
    return chalk.red(errMsg);
  }
  const rcJSON = require(homeConfigPath);
  delete rcJSON[key];
  fs.writeFileSync(homeConfigPath, JSON.stringify(rcJSON, null, 2));
  return chalk.green(`删除key：${key}`)
}

function config (args: string[]): string {
  checkDir();
  const [cmd, key, value] = args;
  let msg = ''
  switch (cmd) {
    case 'get':
      msg = get(key)
      break
    case 'set':
      msg = set(key, value)
      break
    case 'delete':
      msg = deleteKey(key)
      break
    case 'list':
      msg = list()
      break
    default:
      msg = chalk.red(errMsg)
      break
  }

  log.log(msg);

  return msg; // 供测试用例使用
}

export { config, homeDir, homeConfigPath, errMsg }
