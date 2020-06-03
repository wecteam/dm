import { IContext, ILooseObject } from '../../interfaces';
import { build } from '../../index';
import { preview } from '../../common/wxapp-cli';
import * as fs from 'fs';
import inquirer = require('inquirer');

class DmPluginPreview {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    this.initHooks();
  }

  initHooks (): void{
    const previewHooks = this.ctx.hooks.preview;
    const log = this.ctx.log;
    previewHooks.beforeRun.tapPromise('DmPluginPreview-beforeRun', async () => {
      let needBuild = true;
      if (fs.existsSync(this.ctx.dist)) {
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'build',
            message: `检查到已有打包文件存在，是否进行覆盖重新打包 ？`,
            default: true
          }
        ])
        if (!answers.build) {
          needBuild = false;
        }
      } else {
        log.log('需要编译')
      }
      if (needBuild) {
        await build();
      }
    })

    previewHooks.run.tapPromise('DmPluginPreview-run', async () => {
      await preview(this.ctx);
    })
  }
}

export = DmPluginPreview
