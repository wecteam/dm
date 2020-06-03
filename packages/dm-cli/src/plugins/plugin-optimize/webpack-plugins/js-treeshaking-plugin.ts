
import * as path from 'path';
import * as parser from '@babel/parser';
import generate from '@babel/generator';
import traverse from '@babel/traverse';
import chalk from 'chalk';
import log from '../../../common/log';
// 以下引入只作为类型声明
import { VariableDeclarator, Identifier } from '@babel/types';
import { IWebpackCompilerExt, IWebpackCompilationExt, IWebpackModule } from '../../../interfaces'

class JsTreeshakingPlugin {
  apply (compiler: IWebpackCompilerExt): void {
    log.debug('js treeshaking');
    compiler.hooks.emit.tap('JsTreeshakingPlugin', (compilation: IWebpackCompilationExt) => {
      for (const key in compilation.assets) {
        const curAsset = compilation.assets[key];
        if (path.extname(key) === '.js') {
          const code = this.treeshaking(curAsset.$module, curAsset.source());
          compilation.assets[key] = Object.assign(curAsset, {
            source: () => {
              return code;
            },
            size: () => {
              return code.length;
            }
          })
        }
      }
    })
  }
  private treeshaking (WPModule: IWebpackModule, code: string): string {
    const providedExports: boolean|string[] = WPModule.buildMeta.providedExports || [];
    const usedExports = WPModule.usedExports;
    if (!Array.isArray(usedExports) || !Array.isArray(providedExports)) return code;

    let unused = providedExports.filter(item => {
      return !usedExports.includes(item);
    })

    if (!unused.length) return code;
    log.debug('blue', chalk.blue('执行 treeShaking', WPModule.resource));
    log.debug('unused', '[ ' + unused.join(' , ') + ' ]');
    const _removeUnused = function (key: string): void {
      unused = unused.filter((name: string) => !(name === key));
    }
    // TODO 性能提升：想办法拿到 webpack 已经解析好的AST
    try {
      const ast = parser.parse(code, {
        sourceType: 'module'
      });

      traverse(ast, {
        ExportNamedDeclaration (path) {
          const declaration = path.node.declaration;
          if (!declaration) return;
          if (declaration.type === 'FunctionDeclaration') {
            unused.some(exportItem => {
              // references=1表示仅有一次引用，即export的引用，没有在别处调用
              if (declaration.id!.name === exportItem && path.scope.bindings[exportItem] && path.scope.bindings[exportItem].references === 1) {
                log.debug('treeShaking 内联导出方法', exportItem);
                _removeUnused(exportItem);
                path.remove();
                return true;
              }
              return false;
            });
          } else if (declaration.type === 'VariableDeclaration') {
            unused.some((exportItem: string) => {
              // references=1表示仅有一次引用，即export的引用，没有在别处调用
              if (declaration.declarations && path.scope.bindings[exportItem] && path.scope.bindings[exportItem].references === 1) {
                if (declaration.declarations.some((d: VariableDeclarator) => {
                  if ((d.id as Identifier).name === exportItem) {
                    return true;
                  }
                  return false;
                })) {
                  log.debug('treeShaking 变量', exportItem);
                  _removeUnused(exportItem);
                  path.remove();
                  return true;
                }
              }
              return false;
            });
          }
        },
        ExportSpecifier (path) {
          unused.some((exportItem: string) => {
            if (!path.node.exported) {
              log.warn('ExportSpecifier has no exported');
            }
            if (path.node.exported && (path.node.exported.name === exportItem)) {
              // references=1表示仅有一次引用，即export的引用，没有在别处调用
              if (path.scope.bindings[exportItem] && path.scope.bindings[exportItem] && path.scope.bindings[exportItem].references === 1) {
                path.scope.bindings[exportItem].path.remove();
                path.remove();
              }
              log.debug('treeShaking 标识导出方法', exportItem);
              _removeUnused(exportItem);
              return true;
            }
            return false;
          });
        },
        ExportDefaultDeclaration (path) {
          const declaration: any = path.node.declaration;
          if (!declaration || declaration.type === 'ObjectExpression') return;
          unused.some(exportItem => {
            // 如果有default ,说明是default没有引用，直接删除
            if (exportItem === 'default') {
              const name = declaration.name;
              if (name && path.scope.bindings[name] && path.scope.bindings[name].references === 1) {
                // cosnt c = 3;
                // export deafult c;
                path.scope.bindings[name].path.remove();
              }

              path.remove();
              log.debug('treeShaking 默认导出', name || (declaration.id && declaration.id.name) || '');
              _removeUnused(exportItem);
              return true;
            }
            return false;
          })
        }
      })
      code = generate(ast).code
    } catch (error) {
      log.error('treeShaking 异常', error)
    }
    return code;
  }
}
export default JsTreeshakingPlugin;
