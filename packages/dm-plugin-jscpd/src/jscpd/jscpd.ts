import { IContext, ILooseObject } from '@wecteam/dm-cli';
import * as path from 'path';
import * as fs from 'fs';
import * as jscpd from 'jscpd';
import * as pug from 'pug';
import defaultOptions from './options';
import { IOptsExt } from '../hook-types';
import prettyBytes = require('pretty-bytes')

function getSourceLocation (start: ILooseObject, end: ILooseObject): string {
  return `${start.line}:${start.column} - ${end.line}:${end.column}`;
}

function generateLine (clone: ILooseObject, position: ILooseObject): ILooseObject[] {
  const lineNumberA = (clone.duplicationA.start.line + position).toString();
  const lineNumberB = (clone.duplicationB.start.line + position).toString();
  if (clone.duplicationA.blame && clone.duplicationB.blame) {
    return [
      lineNumberA,
      clone.duplicationA.blame[lineNumberA] ? clone.duplicationA.blame[lineNumberA] : '',
      lineNumberB,
      clone.duplicationB.blame[lineNumberB] ? clone.duplicationB.blame[lineNumberB] : ''
    ];
  } else {
    return [lineNumberA, lineNumberB];
  }
}
const detect = async (ctx: IContext): Promise<void> => {
  const { JSCPD } = jscpd;
  const ctxOpts: IOptsExt = ctx.opts;
  const options = Object.assign(defaultOptions, { output: ctx.dist }, ctxOpts.jscpd || {});
  const cpd = new JSCPD(options);
  const utils = ctx.utils

  const clones = await cpd.detectInFiles(options.detectInFiles);

  const formats: ILooseObject = {};
  const statistics: any = {
    lines: {},
    chars: {}
  };
  const total = {
    lines: 0,
    chars: 0
  };
  clones.forEach((item: any) => {
    if (!formats[item.format]) {
      formats[item.format] = {
        sources: {},
        total: {
          lines: 0,
          sources: 0,
          clones: 0,
          duplicatedLines: 0,
          percentage: 0,
          newDuplicatedLines: 0,
          newClones: 0
        }
      };
    }
    const cwd = ctx.cwd
    // 文件路径换算成相对路径
    item.duplicationA.sourceId = path.relative(cwd, item.duplicationA.sourceId);
    item.duplicationB.sourceId = path.relative(cwd, item.duplicationB.sourceId);
    // 获取git commit信息
    item.duplicationA.blame = utils.getBlameInfo(item.duplicationA.sourceId, item.duplicationA.start.line, item.duplicationA.end.line);
    item.duplicationB.blame = utils.getBlameInfo(item.duplicationB.sourceId, item.duplicationB.start.line, item.duplicationB.end.line);

    item.duplicationA.title = `${item.duplicationA.sourceId}[${getSourceLocation(item.duplicationA.start, item.duplicationA.end)}]`;
    item.duplicationB.title = `${item.duplicationB.sourceId}[${getSourceLocation(item.duplicationB.start, item.duplicationB.end)}]`;

    if (!statistics.lines[item.format]) {
      statistics.lines[item.format] = 0;
    }
    if (!statistics.chars[item.format]) {
      statistics.chars[item.format] = 0;
    }
    statistics.lines[item.format] += (item.duplicationA.end.line - item.duplicationA.start.line);
    statistics.chars[item.format] += Buffer.from(item.duplicationA.fragment.replace(/\s/g, '')).length;
  });
  for (const key in statistics.lines) {
    if (statistics.lines.hasOwnProperty(key)) {
      total.lines += (statistics.lines[key] * 1);
    }
  }
  for (const key in statistics.chars) {
    if (statistics.chars.hasOwnProperty(key)) {
      total.chars += (statistics.chars[key] * 1);
    }
  }
  // pug是重jscpd中复用而来
  const reportFunction = pug.compileFile(path.resolve(__dirname, '../../templates/report.pug'));
  const html = reportFunction({
    total,
    statistics,
    formats,
    clones,
    generateLine,
    prettyBytes,
    options
  });
  fs.writeFileSync(`${options.output}/重复分析结果.html`, html, 'utf-8');
};

export { detect };
