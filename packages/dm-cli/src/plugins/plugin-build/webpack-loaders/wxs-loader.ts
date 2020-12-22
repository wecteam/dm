import { IWebpack } from '../../../interfaces';

export = function (this: IWebpack.loader.LoaderContext, content: string): string {
  this.cacheable && this.cacheable();
  return content;
}
