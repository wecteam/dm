import * as fs from 'fs';
import chalk from 'chalk';
import * as XLSX from 'xlsx';

// 以下引入只作为类型声明
import { IAuditResult, IWebpackCompilerExt, IContext } from '../../../interfaces';

class WorkBook {
  workbook: {
    SheetNames: string[];
    Sheets: any;
  };
  constructor (wkData: IAuditResult[]) {
    this.workbook = {
      SheetNames: [],
      Sheets: {}
    };
    this.workbook.Sheets = {};

    wkData.forEach((wk: IAuditResult) => {
      this.workbook.SheetNames.push(wk.name);
      this.workbook.Sheets[wk.name] = XLSX.utils.aoa_to_sheet(wk.data);
    });
  }

  /**
    * 将数据写入Excel
    * @param {string} filename 文件路径
    */
  writeFile (filename: string): void {
    XLSX.writeFile(this.workbook, filename);
  }
}

class AuditExportResultPlugin {
  private ctx: IContext;
  constructor (ctx: IContext) {
    this.ctx = ctx;
  }
  apply (compiler: IWebpackCompilerExt): void {
    const log = this.ctx.log;
    const auditDist = this.ctx.opts.output!.audit!
    compiler.hooks.done.tap('AuditExportResultPlugin', () => {
      if (compiler.$auditResult) {
        log.start('开始输出审计结果');
        const excel = new WorkBook(compiler.$auditResult as IAuditResult[]);
        if (!fs.existsSync(auditDist)) {
          fs.mkdirSync(auditDist);
        }
        excel.writeFile(`${auditDist}/依赖分析结果.xlsx`);
        log.log(chalk.green(`审计结果已输出到目录：${auditDist}/依赖分析结果.xlsx`));
        log.done()
      } else {
        log.warn(chalk.red('未发现审计数据'));
      }
    });
  }
}
export default AuditExportResultPlugin;
