
import * as path from 'path';
import * as fs from 'fs';
import log from '../../../common/log';

// 以下引用仅作为类型申明使用
import { IContext, IFileVexNode, IWebpackCompilerExt, IWebpackCompilationExt } from '../../../interfaces';

type Npm = {
  /** 包名 */
  name: string; // @wecteam/a
  /** 是否在主包 */
  isMain: boolean;
  /** 包名安装路径，要么在主包，要么在当前子包(subRoot) */
  location: string; // /users/xxx/app/sub1
}

/** 记录依赖npm包的文件信息 */
type IssuerMap = {
  [key in string]: { // /users/xxx/app/sub1/index.js
    /** issuer所在的小程序分包根路径 */
    subRoot: string; // '/users/xxx/app/sub1'
    /** issuer依赖的npm包 */
    deps: Npm[];
  };
}

type NpmMap = {
  [key in string]: { // @base/env
    isMain: boolean;
  }
}

class NpmPlugin {
  private issuerMap: IssuerMap;
  private ctx: IContext;
  /** 记录所有npm是否安装在主包 */
  private npmMap: NpmMap;
  constructor (ctx: IContext) {
    this.ctx = ctx;
    this.issuerMap = {}; // js模块依赖npm包结构
    this.npmMap = {}
    log.debug('npm-plugin init success');
  }

  apply (compiler: IWebpackCompilerExt): void {
    compiler.hooks.emit.tap('NpmPlugin', (compilation: IWebpackCompilationExt) => {
      // 智能分包
      this.calNpmLocation(compiler);
      // npm包路径处理：兼容小程序低版本，拷贝npm文件到对应子包
      this.npm2relative(compilation)
    });
  }

  /**
   * 寻找分包根路径，没找到返回''，说明在主包
   * @param filepath 文件路径
   */
  findSubRoot (filepath: string): string {
    const subPkgs = this.ctx.getTempData<Set<string>>('subPkgs');
    let subRoot = '';
    for (const subPath of subPkgs) {
      if (filepath.startsWith(subPath)) {
        subRoot = subPath;
        break;
      }
    }
    return subRoot;
  }

  /**
   * 保存isssuer的包信息：当前issuers依赖了哪些包，分别安装在什么路径
   * @param pkgName 包名
   * @param issuers 依赖当前包的文件路径
   * @param isMain 是否放在主包
   */
  saveIssuer (pkgName: string, issuers: Set<string>, isMain = false): void{
    issuers.forEach((issuer) => {
      const curIssuer = this.issuerMap[issuer];
      curIssuer.deps.push({
        name: pkgName,
        isMain,
        location: isMain ? this.ctx.cwd : curIssuer.subRoot
      })
    })
  }

  /**
   * 智能分包，根据依赖情况决定每个npm包应该在哪个分包
   */
  calNpmLocation (compiler: IWebpackCompilerExt): void {
    const depsGraph = compiler.$depsGraph!

    // 获取所有npm包及其issuers信息,根据策略将npm包分到各子包
    depsGraph.getAllNpmVexNodes().forEach(npmVexNode => {
      const npmName = npmVexNode.name;
      const issuers = new Set<string>()
      const issuerSubPkgs = new Set<string>();
      let hasMainIssuer = false;
      // 从依赖图中取npm的issuers
      depsGraph.getHeadVexNodes<IFileVexNode>(npmVexNode, 'file').forEach(item => {
        const issuer = item.filepath;
        issuers.add(issuer);
        if (!this.issuerMap[issuer]) {
          this.issuerMap[issuer] = { deps: [], subRoot: '' } // 保存所有issuer
        }
        const subRoot = this.findSubRoot(issuer);
        if (subRoot) { // 在分包中
          issuerSubPkgs.add(subRoot);
          this.issuerMap[issuer].subRoot = subRoot; // 保存issuer所在的子包
        } else {
          hasMainIssuer = true;
        }
      });

      // 分包策略
      if (hasMainIssuer || issuerSubPkgs.size >= this.ctx.opts.npm!.maxRefer!) {
        // 放主包
        this.saveIssuer(npmName, issuers, true);
        this.npmMap[npmName] = { isMain: true };
      } else {
        // 放到各子包
        this.saveIssuer(npmName, issuers);
        this.npmMap[npmName] = { isMain: false };
      }
    });
  }

  /**
    * 将npm引入修改为相对路径引入
    * @param compilation
    */
  npm2relative (compilation: IWebpackCompilationExt): void {
    const sourceDir = compilation.options!.context + path.sep;
    for (const issuer in this.issuerMap) {
      const issuerInfo = this.issuerMap[issuer];
      const assertPath = issuer.replace(sourceDir, '');
      const curAsset = compilation.assets[assertPath];
      if (curAsset) {
        let code = curAsset.source();
        issuerInfo.deps.forEach((dep) => {
          // 拷贝当前依赖的npm文件
          this.copyNpmFile(dep, sourceDir, compilation);

          // 修改当前npm依赖路径
          let relativeUrl = path.relative(path.dirname(issuer), dep.location) || '.';
          relativeUrl = relativeUrl.replace(/\\/g, '/');
          const depRegex = new RegExp(`from\\s+['"]${dep.name}['"]`, 'g');
          code = code.replace(depRegex, `from '${relativeUrl}/miniprogram_npm/${dep.name}/index'`);
        })
        compilation.assets[assertPath] = Object.assign(curAsset, {
          source: () => {
            return code;
          },
          size: () => {
            return code.length;
          }
        })
      } else {
        log.warn('npm2relative：在asserts中没有找到文件：', assertPath);
      }
    }
  }
  /**
   * 拷贝npm包文件
   * @param npmInfo  包信息
   * @param sourceDir 源项目根目录
   * @param compilation
   */
  copyNpmFile (npmInfo: Npm, sourceDir: string, compilation: IWebpackCompilationExt): void {
    const npmRelative = ['miniprogram_npm', ...npmInfo.name.split('/'), 'index.js']
    const npmSourcePath = path.resolve(sourceDir, ...npmRelative);
    const npmDistPath = path.resolve(npmInfo.location, ...npmRelative)
    const assertPath = npmDistPath.replace(sourceDir, '');
    if (compilation.assets[assertPath]) return;

    let npmContent = fs.readFileSync(npmSourcePath, 'utf8');
    npmContent = npmContent.replace(/\s*require\s*\(\s*["']([^'".\s]+)["']\s*\)/g, (_, dep) => {
      let relativeUrl = ''
      if (this.npmMap[dep].isMain) { // npm安装在主包,基础库使用lerna fixed模式，每个基础包的依赖都是同一个版本，因此安装时会打平
        relativeUrl = path.relative(path.dirname(npmDistPath), sourceDir) || '.'; // 相对主包目录
      } else { // npm没有安装在主包时，安装在当前子包
        relativeUrl = path.relative(path.dirname(npmDistPath), npmInfo.location) || '.'; // 相对当前分包目录
      }
      relativeUrl = relativeUrl.replace(/\\/g, '/');
      return ` require('${relativeUrl}/miniprogram_npm/${dep}/index')`
    })
    compilation.assets[assertPath] = {
      source: (): string => {
        return npmContent;
      },
      size: (): number => {
        return npmContent.length;
      }
    }
  }
}
export default NpmPlugin;
