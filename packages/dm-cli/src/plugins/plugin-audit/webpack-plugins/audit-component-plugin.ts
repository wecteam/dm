import * as path from 'path';
import * as CliTable3 from 'cli-table3';
import chalk from 'chalk';
// 以下引入只作为类型声明
import { IContext, IWebpackCompilerExt, IAuditResult, IFileVexNode } from '../../../interfaces';

/**
 * 获取组件被依赖情况，若组件只被子包依赖，分析是否可迁移到子包中
 * 1、因为子包不能引用另一个子包的组件，所以只分析主包的组件即可
 * 2、当主包中的组件只被一个子包引用时，说明这个组件适合放入到该子包中
 * 3、要分析组件中每一个文件的依赖情况，有可能个别文件不能迁移到子包
 */
class AuditComponentPlugin {
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
    const log = this.ctx.log;
    log.debug('开始组件依赖分析');
    compiler.hooks.done.tap('AuditComponentPlugin', () => {
      log.start('组件依赖分析');
      const suggestMoveToSub: IAuditResult = {
        name: '组件依赖分析',
        data: [['组件', '依赖子包']]
      };
      const depsGraph = compiler.$depsGraph;
      if (depsGraph) {
        const fileVexNodeList = depsGraph.getAllFileVexNodes();
        /**
         * a、按目前的分析方式，出现在依赖图结构中的json文件不是组件的就是page的
         * b、没有入度的json可以确定是page的json
         * 基于以上两点，可以帅选出json文件指代小程序组件
         * 组件的被依赖情况取组件下每个文件被依赖的并集
         */
        const componentVexNodeList: IFileVexNode[] = fileVexNodeList.filter(fileVexNode => /\.json$/.test(fileVexNode.filepath) && fileVexNode.firstin);
        /**
         * 分析组件下每个文件被依赖情况:
         *  1. 只分析主包中的组件
         *  2. 要排除组件下文件间的依赖
         *  3. 若文件被主包依赖，直接排除
         */
        componentVexNodeList.forEach(component => {
          if (this.isInSubPackage(component.filepath)) return;
          const componentDir: string = path.dirname(component.filepath);
          const componentFiles: IFileVexNode[] = fileVexNodeList.filter(file => file.filepath.indexOf(componentDir) === 0); // 获取组件下的所有文件
          const issuersPath = new Set<string>(); // 记录被哪些文件引用了
          let hasMainPkgIssuer = false; // 是否有被主包引用
          componentFiles.forEach(item => {
            depsGraph.getHeadVexNodes<IFileVexNode>(item).forEach(issuerNode => {
              if (issuerNode.filepath.indexOf(componentDir) !== 0) {
                if (this.isInSubPackage(issuerNode.filepath)) {
                  issuersPath.add(issuerNode.filepath);
                } else {
                  hasMainPkgIssuer = true;
                }
              }
            });
          });
          const issuersSubPkgs = this.inWhichSubPackages(Array.from(issuersPath)).map(item => this.getRelativePath(item));
          if (issuersSubPkgs.length < this.maxRefer && !hasMainPkgIssuer) {
            suggestMoveToSub.data.push([
              this.getRelativePath(component.filepath).replace(/\.[^.]*$/, ''),
              issuersSubPkgs.join('\n')
            ]);
          };
        });
        if (suggestMoveToSub.data.length) {
          const printTable: any = new CliTable3({
            head: ['', '组件', '依赖的子包']
          });
          suggestMoveToSub.data.forEach((item, index: number) => {
            printTable.push([index + 1, item[0], item[1]]);
          });
          log.log(chalk.red(`以下组件主包没有引用且少于${this.maxRefer}个子包在引用，建议移到相应子包\n${printTable.toString()}\n`));
        }
      }
      if (!compiler.$auditResult) {
        compiler.$auditResult = [];
      }
      compiler.$auditResult.push(suggestMoveToSub);
    });
  }
}
export default AuditComponentPlugin;
