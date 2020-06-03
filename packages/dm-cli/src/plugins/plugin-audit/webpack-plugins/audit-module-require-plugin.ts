import * as path from 'path';
import chalk from 'chalk';
import * as CliTable3 from 'cli-table3';

// 以下引入只作为类型声明
import { IContext, IAuditResult, IWebpackCompilerExt } from '../../../interfaces';

/**
 * 分析使用了require的模块
 *    获取模块所有依赖，如果其中有一个是使用require模式就算
 */
class AuditModuleRequirePlugin {
  ctx: IContext;
  constructor (ctx: IContext) {
    this.ctx = ctx;
  }
  private getRelativePath (abPath: string): string {
    return path.relative(this.ctx.cwd, abPath);
  }
  apply (compiler: IWebpackCompilerExt): void {
    const log = this.ctx.log;
    compiler.hooks.done.tap('AuditModuleRequirePlugin', () => {
      log.start('require语句分析');
      const hasRequireFile: IAuditResult = {
        name: '使用了require的模块的模块',
        data: [['文件路径', '最后一次修改者', '最近一次修改时间']]
      };
      const depsGraph = compiler.$depsGraph;
      if (depsGraph) {
        depsGraph.getAllFileVexNodes().forEach(fileVex => {
          let firstout = fileVex.firstout;
          let hadRequire = false;
          if (firstout && /\.js$/.test(fileVex.filepath)) {
            while (firstout) {
              if (firstout.depType === 'require') {
                hadRequire = true;
              }
              firstout = firstout.taillink;
            }
          }
          if (hadRequire) {
            const lastCommitInfo = this.ctx.utils.getLastCommitInfo(fileVex.filepath);
            hasRequireFile.data.push([
              this.getRelativePath(fileVex.filepath),
              lastCommitInfo.author,
              lastCommitInfo.dateStr
            ]);
          }
        });
        if (hasRequireFile.data.length) {
          const printTable: any = new CliTable3({
            head: ['', '文件路径', '最后一次修改者', '最近一次修改时间']
          });
          hasRequireFile.data.forEach((item, index: number) => {
            printTable.push([index + 1, item[0], item[1], item[2]]);
          });
          log.log(chalk.red(`以下文件使用require引入模块方式\n${printTable.toString()}\n`));
        }
      }
      if (!compiler.$auditResult) {
        compiler.$auditResult = [];
      }
      compiler.$auditResult.push(hasRequireFile);
    });
  }
}
export default AuditModuleRequirePlugin;
