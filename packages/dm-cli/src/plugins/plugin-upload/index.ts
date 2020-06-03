import { IContext, ILooseObject } from '../../interfaces';
import { upload } from '../../common/wxapp-cli';
import { build } from '../../processes';
import * as fs from 'fs';
import inquirer = require('inquirer');

class DmPluginUpload {
  ctx: IContext;
  params?: ILooseObject;
  constructor (ctx: IContext, params?: ILooseObject) {
    this.ctx = ctx;
    this.params = params;
    this.initHooks();
  }

  initHooks (): void{
    const uploadHooks = this.ctx.hooks.upload;
    const log = this.ctx.log;
    uploadHooks.beforeRun.tapPromise('DmPluginUpload-beforeRun', async () => {
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

    uploadHooks.run.tapPromise('DmPluginUpload-run', async () => {
      await upload(this.ctx);
    })
  }
}

export = DmPluginUpload
