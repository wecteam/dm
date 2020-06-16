import { Context } from '../../../impl/context.impl';
import { IAppJSON, ISubpackages, IWebpack } from '../../../interfaces'
import { compile } from '../webpack-loaders/ifelse-loader';
import * as fs from 'fs'
import * as path from 'path'
import * as utils from '../../../common/utils';
import log from '../../../common/log';
import chalk from 'chalk';

class Entry {
  private ctx: Context;
  private webpackConfig: IWebpack.Configuration
  constructor (ctx: Context, webpackConfig: IWebpack.Configuration) {
    this.ctx = ctx;
    this.webpackConfig = webpackConfig;
  }
  private concatRequire (content: string, pagePath: string): string {
    const cwd = this.ctx.cwd;
    const requires = [
      content,
      `require('./${pagePath}');`,
      `require('./${pagePath}.wxml');`
    ]
    const sassSuffix = this.ctx.opts.sassSuffix;
    // wxss和json不是必须的
    if (fs.existsSync(path.resolve(cwd, `${pagePath}.${sassSuffix}`))) { // .undefiend
      requires.push(`require('./${pagePath}.${sassSuffix}');`)
    } else if (fs.existsSync(path.resolve(cwd, `${pagePath}.wxss`))) {
      requires.push(`require('./${pagePath}.wxss');`)
    }
    if (fs.existsSync(path.resolve(cwd, `${pagePath}.json`))) {
      requires.push(`require('./${pagePath}.json');`)
    }
    return requires.join('\n');
  }
  private getAppJSON (): IAppJSON {
    const ctx = this.ctx;
    const { app, type } = ctx.opts;
    let appPath = path.resolve(ctx.cwd, 'app.json');
    if (app) {
      const targetAppPath = path.resolve(ctx.cwd, `app.${app}.json`);
      if (fs.existsSync(targetAppPath)) {
        appPath = targetAppPath;
      }
    }
    let appJson = fs.readFileSync(appPath!, 'utf8');
    appJson = compile(appJson, { fileType: 'json', app, type }); // 条件编译处理一下app.json
    return JSON.parse(appJson);
  }

  // 单页抽取处理，修改app.json
  private singlePage (page: string[], appJSON: IAppJSON): void {
    const pageSet = new Set(page);
    if (this.ctx.opts.tabbar && appJSON.tabBar && appJSON.tabBar.list) { // 保留tabbar
      appJSON.tabBar.list.forEach(item => {
        pageSet.add(item.pagePath);
      })
    } else {
      delete appJSON.tabBar
    }

    // 单页抽取仍然保持原来的子包结构，如果所有页面都来自子包，则将第一个子包作为主包
    const allPage = Array.from(pageSet);
    const pages: string[] = [];
    const subPackages = appJSON.subPackages || []
    const subPackagesMap: Record<string, Partial<ISubpackages>> = {}
    allPage.forEach(item => {
      if (!appJSON.pages.includes(item)) {
        let bingo = false; // 有匹配到子包
        log.debug('开始匹配子包', item);
        for (const subPackage of subPackages) {
          const root = subPackage.root;
          if (item.startsWith(root)) { // 匹配到子包
            bingo = true;
            const pagePath = item.replace(root, '').replace(/^\//, '');

            if (!subPackage.pages.includes(pagePath)) {
              log.warn(`指定页面 ${item} 在分包配置 ${root} 中不存在，已模拟添加到该分包`)
            }

            const sRoot = root.replace(/\/$/, '');
            if (subPackagesMap[sRoot]) {
              subPackagesMap[sRoot].pages!.push(pagePath)
            } else {
              subPackagesMap[sRoot] = {
                root: sRoot,
                pages: [pagePath]
              }
              if (subPackage.plugins) {
                subPackagesMap[sRoot].plugins = subPackage.plugins
              }
            }
            log.debug('匹配到子包', sRoot, pagePath);
            break;
          }
        }
        if (!bingo) {
          log.warn(`指定页面 ${item} 既不在主包配置，也不在分包配置，已模拟添加到主包`);
          pages.push(item);
        }
      } else {
        log.debug('匹配到主包', item);
        pages.push(item);
      }
    })

    const newSubPackages: ISubpackages[] = [];
    for (const key in subPackagesMap) {
      newSubPackages.push(subPackagesMap[key] as ISubpackages)
    }
    // 没有主包页面的情况
    if (pages.length === 0) {
      log.log('指定页面只有一个分包，将提取成主包配置')
      const firstSub = newSubPackages.shift();
      if (firstSub) {
        firstSub.pages.forEach((pagePath: string) => {
          pages.push(`${firstSub.root}/${pagePath}`)
        });
        appJSON.plugins = Object.assign(appJSON.plugins || {}, firstSub.plugins || {})
      }
    }

    appJSON.pages = pages
    appJSON.subPackages = newSubPackages;
    delete appJSON.preloadRule;

    log.log(chalk.green('单页抽取:'), '\n主包:', appJSON.pages.join(' , '), '\n子包:', appJSON.subPackages.length ? appJSON.subPackages.map(item => item.pages.join(' , ')).join(' , ') : '无');
  }
  generate (): void {
    log.start('生成入口');
    log.debug(`开始生成入口文件`);
    const cwd = this.ctx.cwd;
    const appJSON = this.getAppJSON();
    log.debug(`获取 app.json 文件成功`);

    this.ctx.setTempData('appJSON', appJSON)

    let entryContent = '';
    // 单页抽取
    const page = this.ctx.opts.page
    if (page) {
      log.debug(`开始执行单页抽取`, (page as string[]).join(' , '));
      this.singlePage(page as string[], appJSON)
    }

    // 主包依賴
    if (appJSON.pages) {
      log.debug(`主包页面：${appJSON.pages.length} 个`);

      appJSON.pages.forEach((page: string) => {
        entryContent = this.concatRequire(entryContent, page);
      });
    }

    // 子包依賴
    const subPkgs = new Set<string>()
    this.ctx.setTempData('subPkgs', subPkgs)
    if (appJSON.subPackages) {
      log.debug(`子包数：${appJSON.subPackages.length} 个`);

      appJSON.subPackages.forEach(subPackage => {
        subPackage.root = subPackage.root.replace(/\/$/, ''); // 兼容root结尾不包含/的情况
        subPkgs.add(path.resolve(cwd, subPackage.root));
        subPackage.pages.forEach((page: string) => {
          entryContent = this.concatRequire(entryContent, `${subPackage.root}/${page}`);
        })
      });
    }

    // 全局Component
    if (appJSON.usingComponents) {
      entryContent += utils.getComponentsFiles(this.ctx, appJSON.usingComponents, cwd).join('\n');
    }

    // 小程序内搜索
    if (appJSON.sitemapLocation) {
      entryContent += `require('${appJSON.sitemapLocation}');\n`;
    } else if (fs.existsSync(`sitemap.json`)) {
      entryContent += `require('./sitemap.json');\n`;
    }

    // 插件功能页
    const functionalDir = './functional-pages';
    if (appJSON.functionalPages && fs.existsSync(path.resolve(cwd, functionalDir))) {
      const getFunctionalFiles = (dir: string): void => {
        const paths = fs.readdirSync(dir);
        paths.forEach(item => {
          const itemPath = `${dir}/${item}`
          const info = fs.statSync(itemPath);
          if (info.isDirectory()) {
            getFunctionalFiles(itemPath);
          } else {
            entryContent += `require('${itemPath}');\n`
          }
        })
      }
      getFunctionalFiles(functionalDir)
    }

    // 其他依賴
    const sassSuffix = this.ctx.opts.sassSuffix;
    if (fs.existsSync(path.resolve(this.ctx.cwd, `app.${sassSuffix}`))) {
      entryContent += `require('./app.${sassSuffix}');\n`;
    } else {
      entryContent += "require('./app.wxss');\n";
    }
    entryContent += "require('./app.js');\n";

    fs.writeFileSync(this.webpackConfig.entry as string, entryContent);
    log.debug(`入口文件生成完成：${this.webpackConfig.entry} `);

    // watch时 ctrl+c 强制退出
    process.on('SIGINT', () => {
      this.delete()
      process.exit(0)
    });
  }
  delete (): void {
    const srcEntry = this.webpackConfig.entry as string;
    if (fs.existsSync(srcEntry)) {
      fs.unlinkSync(srcEntry);
    }
  }
}

export { Entry }
