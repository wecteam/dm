import * as path from 'path';
import chalk from 'chalk';
import * as CliTable3 from 'cli-table3';

// 以下引入只作为类型声明
import { IContext, IWebpackCompilerExt, IAuditResult, IFileVexNode } from '../../../interfaces';

/**
 * 分析主包中单个文件的依赖情况：即获取文件的入度，要去除var类型的弧
 */
class AuditFilePlugin {
  ctx: IContext;
  maxRefer: number;
  constructor (ctx: IContext, maxRefer = 3) {
    this.ctx = ctx;
    this.maxRefer = maxRefer;
  }
  private getRelativePath (abPath: string): string {
    return path.relative(this.ctx.cwd, abPath);
  }
  /**
   * 判断文件是否在子包中
   * @param {String} filePath 文件相对路径
   */
  isInSubPackage (filePath: string): boolean {
    const subPackages: string[] = Array.from(this.ctx.getTempData('subPkgs'));
    return subPackages.some((subPath: string) => filePath.indexOf(subPath) === 0);
  }
  /**
    * 路劲在哪些子包中
    * @param {Array}} pathArr 路径数组
    */
  inWhichSubPackages (pathArr: string[]): Array<string> {
    const subPackages: string[] = Array.from(this.ctx.getTempData('subPkgs'));
    const subs = pathArr.map((path: string) => subPackages.find((subPath: string) => path.indexOf(subPath) === 0));
    return Array.from(new Set<string>(subs.filter((item: string | undefined) => !!item) as string[]));
  }
  apply (compiler: IWebpackCompilerExt): void {
    const log = this.ctx.log
    log.debug('开始文件依赖分析');
    compiler.hooks.done.tap('AuditFilePlugin', () => {
      log.start('文件依赖分析');
      const suggestMoveToSub: IAuditResult = {
        name: '文件依赖分析',
        data: [['文件路径', '大小', '最后一次修改者', '最近一次修改时间', '依赖的子包', '引用文件']]
      };
      const depsGraph = compiler.$depsGraph;
      if (depsGraph) {
        const fileVexNodeList = depsGraph.getAllFileVexNodes();
        fileVexNodeList.forEach(fileVexNode => {
          if (this.isInSubPackage(fileVexNode.filepath)) return;
          const issuerList: IFileVexNode[] = depsGraph.getHeadVexNodes<IFileVexNode>(fileVexNode, 'file');
          const issuersSubPkgs = this.inWhichSubPackages(issuerList.map(item => item.filepath));
          if (issuerList.length && issuersSubPkgs.length < this.maxRefer && issuerList.every(issuer => this.isInSubPackage(issuer.filepath))) {
            let lastCommitInfo;
            if (fileVexNode.author) {
              lastCommitInfo = {
                author: fileVexNode.author,
                dateStr: fileVexNode.date
              }
            } else {
              lastCommitInfo = this.ctx.utils.getLastCommitInfo(fileVexNode.filepath);
            }

            suggestMoveToSub.data.push([
              this.getRelativePath(fileVexNode.filepath),
              fileVexNode.size || '',
              lastCommitInfo.author || '',
              lastCommitInfo.dateStr || '',
              issuersSubPkgs.map(item => this.getRelativePath(item)).join('\n'),
              issuerList.map(item => this.getRelativePath(item.filepath)).join('\n')
            ]);
          }
        });
      }

      if (suggestMoveToSub.data.length) {
        const printTableFile: any = new CliTable3({
          head: ['', '文件', '依赖的子包', '引用文件']
        });
        suggestMoveToSub.data.forEach((item, index: number) => {
          printTableFile.push([index + 1, item[0], item[4], item[5]]);
        });
        log.log(chalk.red(`以下文件主包没有引用且少于${this.maxRefer}个包在引用，建议移到相应子包\n${printTableFile.toString()}\n`));
      }
      if (!compiler.$auditResult) {
        compiler.$auditResult = [];
      }
      compiler.$auditResult.push(suggestMoveToSub);
    });
  }
}
export default AuditFilePlugin;
