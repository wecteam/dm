import * as path from 'path';
import chalk from 'chalk';
import * as CliTable3 from 'cli-table3';

// 以下引入只作为类型声明
import { IContext, IWebpackCompilerExt, IAuditResult } from '../../../interfaces';

/**
 * 分析不是单个导出函数或变量的模块
 *    通过模块的exportType属性判断即可
 */
class AuditModuleExportPlugin {
  ctx: IContext;
  constructor (ctx: IContext) {
    this.ctx = ctx;
  }
  private getRelativePath (abPath: string): string {
    return path.relative(this.ctx.cwd, abPath);
  }
  apply (compiler: IWebpackCompilerExt): void {
    const log = this.ctx.log;
    compiler.hooks.done.tap('AuditModuleExportPlugin', () => {
      log.start('默认导出分析');
      const exportDefaultFile: IAuditResult = {
        name: '不是单个导出函数或变量的模块',
        data: [['文件路径', '最后一次修改者', '最近一次修改时间']]
      };
      const depsGraph = compiler.$depsGraph;
      if (depsGraph) {
        depsGraph.getAllFileVexNodes().forEach(item => {
          if (item.exportType === 'exportDefault') {
            const lastCommitInfo = this.ctx.utils.getLastCommitInfo(item.filepath);
            exportDefaultFile.data.push([
              this.getRelativePath(item.filepath),
              lastCommitInfo.author,
              lastCommitInfo.dateStr
            ]);
          }
        });
        if (exportDefaultFile.data.length) {
          const printTable: any = new CliTable3({
            head: ['', '文件路径', '最后一次修改者', '最近一次修改时间']
          });
          exportDefaultFile.data.forEach((item, index: number) => {
            printTable.push([index + 1, item[0], item[1], item[2]]);
          });
          log.log(chalk.red(`以下文件使用了默认导出\n${printTable.toString()}\n`));
        }
      }
      if (!compiler.$auditResult) {
        compiler.$auditResult = [];
      }
      compiler.$auditResult.push(exportDefaultFile);
    });
  }
}
export default AuditModuleExportPlugin;
