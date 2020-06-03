import { IContext, ILooseObject } from '../../interfaces';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import inquirer = require('inquirer');

class DmPluginNew {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    this.initHooks();
  }
  /** 获取当前目录相对app根目录层级 */
  getCurDeep (curPath: string): number {
    const parentPath = path.resolve(curPath, '../');
    const flagFile = path.resolve(curPath, 'app.json'); // app.json是小程序必须有的文件，用其作为是小程序目录的标识
    if (fs.existsSync(flagFile)) {
      return 1;
    } else if (curPath === parentPath) {
      return -1;
    } else {
      const deep = this.getCurDeep(parentPath);
      return deep > 0 ? deep + 1 : -1;
    }
  }
  initHooks (): void{
    const newHooks = this.ctx.hooks.new;
    const log = this.ctx.log;
    newHooks.beforeRun.tapPromise('WxaPluginNew-beforeRun', async () => {
      log.debug(`开始查找 app.json 文件`);
      const deep = this.getCurDeep(this.ctx.cwd);
      if (deep === -1) {
        throw chalk.red(`请在小程序目录下执行该操作`);
      }
      newHooks.beforeRun.data.deep = deep;
    })

    newHooks.run.tapPromise('DmPluginNew-run', async () => {
      const ctx = this.ctx
      let { type, name } = ctx.opts;
      const deep = newHooks.beforeRun.data.deep;

      if (!type) {
        const typeAnwser = await inquirer.prompt([{
          type: 'list',
          name: 'type',
          message: '想创建的类型?',
          choices: [
            'page',
            'component'
          ]
        }]);
        type = typeAnwser.type;
        log.debug(`输入类型：${type}`);
      }

      if (!name) {
        const nameAnwser = await inquirer.prompt([{
          type: 'input',
          name: 'name',
          message: `请输入${type}名称?`,
          validate: (input): boolean => Boolean(input && input.trim())
        }]);
        name = nameAnwser.name;
        log.debug(`输入了名称：${name}`);
      }

      if (type !== 'page' && type !== 'component') {
        throw chalk.red(`未知类型：${type}，请输入page或者component`);
      }

      if (fs.existsSync(path.resolve(ctx.cwd, name!))) {
        throw chalk.red(`已存在${name}`);
      }

      const tplDir = path.resolve(__dirname, `../../../templates/new/tpl/${(type)}`);
      log.debug(`开始创建： ${type}，模板文件：${tplDir}`);
      const rootDir = '../'.repeat(deep);
      log.debug(`根目录路径：${rootDir}`);
      fs.mkdirSync(`${name}`);
      log.debug(`创建目录完成：${name}`);

      fs.writeFileSync(`${name}/${name}.wxss`, fs.readFileSync(`${tplDir}/index.wxss`, 'utf-8'), 'utf-8');
      fs.writeFileSync(`${name}/${name}.js`, fs.readFileSync(`${tplDir}/index.js`, 'utf-8'), 'utf-8');
      fs.writeFileSync(`${name}/${name}.json`, fs.readFileSync(`${tplDir}/index.json`, 'utf-8'), 'utf-8');
      fs.writeFileSync(`${name}/${name}.wxml`, fs.readFileSync(`${tplDir}/index.wxml`, 'utf-8'), 'utf-8');
      log.log(chalk.green(`${type} ${name}创建成功`));
    })
  }
}

export = DmPluginNew
