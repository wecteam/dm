import * as utils from '../../../common/utils';
import { IWebpack } from '../../../interfaces';
// 注意loader的导出不能使用export default function
export = function (this: IWebpack.loader.LoaderContext, content: string): string {
  this.cacheable && this.cacheable();
  let result = 'module.exports = ""';
  let requires = [];
  const query = this.query || {};
  const contentObj = JSON.parse(content);
  const usingComponents = contentObj.usingComponents || {};

  requires = utils.getComponentsFiles(query.ctx, usingComponents, this.context);

  if (requires.length) {
    result = requires.join('\n') + result;
  }

  return result;
}
