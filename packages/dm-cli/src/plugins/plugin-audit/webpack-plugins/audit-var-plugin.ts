import * as path from 'path';
import chalk from 'chalk';
import * as CliTable3 from 'cli-table3';
// 依赖其他模块，抽取为独立插件后要修改
import log from '../../../common/log';

// 以下引入只作为类型声明
import { IContext, IWebpackCompilerExt, IAuditResult, IVarVexNode, IFileVexNode } from '../../../interfaces';

/**
 * 分析函数依赖
 */
class AuditVarPlugin {
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
    compiler.hooks.done.tap('AuditVarPlugin', () => {
      log.start('函数依赖分析');
      const suggestMoveToSub: IAuditResult = {
        name: '函数的依赖情况分析',
        data: [['文件路径', '函数/常量', '依赖的子包', '引用文件']]
      };
      const depsGraph = compiler.$depsGraph;
      if (depsGraph) {
        const varVexList: IVarVexNode[] = depsGraph.getAllVarVexNodes();
        varVexList.map((varNode: IVarVexNode): void => {
          if (this.isInSubPackage(varNode.filepath)) return;
          const issuerList: IFileVexNode[] = depsGraph.getHeadVexNodes<IFileVexNode>(varNode, 'file');
          const issuerPaths = issuerList.map(item => item.filepath);
          const issuersSubPkgs = this.inWhichSubPackages(issuerPaths);
          if (issuerPaths.length && issuersSubPkgs.length < this.maxRefer && issuerPaths.every((issuer: string) => this.isInSubPackage(issuer))) {
            suggestMoveToSub.data.push([
              this.getRelativePath(varNode.filepath),
              varNode.name,
              issuersSubPkgs.map(item => this.getRelativePath(item)).join('\n'),
              issuerPaths.map(item => this.getRelativePath(item)).join('\n')
            ]);
          }
        });
        if (suggestMoveToSub.data.length) {
          const printTable: any = new CliTable3({
            head: ['', '模块', '函数名/常量名', '依赖的子包']
          });
          suggestMoveToSub.data.forEach((item, index: number) => {
            printTable.push([index + 1, item[0], item[1], item[2]]);
          });
          log.log(chalk.red(`以下函数或常量主包没有引用且少于${this.maxRefer}个子包在引用，建议移到相应子包\n${printTable.toString()}\n`));
        }
      }
      if (!compiler.$auditResult) {
        compiler.$auditResult = [];
      }
      compiler.$auditResult.push(suggestMoveToSub);
    });
  }
}
export default AuditVarPlugin;
