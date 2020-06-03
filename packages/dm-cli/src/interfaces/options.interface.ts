
import { IWebPackChain } from './webpack.interface'
export interface ILooseObject {
  // eslint-disable-next-line
  [key: string]: any;
}
/**
 * 参数 options 的通用属性
 */
export interface IParents {
  /** 是否debug */
  debug?: boolean;
  /** CLI执行目录 */
  cwd?: string;
  /** 指定小程序 */
  app?: string;
  /** 指定类型：xcx、h5、react */
  type?: string;
}
interface IOutput {
  /** build命令输出目录 */
  build?: string;
  /** audit命令输出目录 */
  audit?: string;
  /** preview命令输出目录 */
  upload?: string;
  /** preview命令输出目录 */
  preview?: string;
  /** new 命令输出目录，暂时用不到 */
  new?: string;
}

interface IAppMap {
  /** appkey */
  [key: string]: {
    /** 小程序id */
    appid: string;
    /** 小程序项目名 */
    projectname: string;
  };
}

export interface IBuildOpts extends IParents {
  /** 启动文件监听 */
  watch?: boolean;
  /** 单页抽取 */
  page?: string | Array<string>;
  /** 保留tabbar及相关页面 */
  tabbar?: boolean;
  /** 启动开发者工具 */
  open?: boolean;
  /** 小程序开发者工具cli路径 */
  wxcli?: string;
  /** 需要额外添加的目录 */
  include?: string;
  /** 指定生成文件目录，仅用于命令行参数 */
  'output.build'?: string;
  /** 指定生成文件目录-标准格式 */
  output?: IOutput;
  /** 发布模式 */
  release?: boolean;
  /** 版本号 */
  version?: string;
  /** 内测版本 */
  dev?: boolean;
  /** js treeshaking */
  jsTreeShaking?: boolean;
  /** css treeshaking */
  cssTreeShaking?: boolean;
}

export interface IPreviewOpts extends IParents {
  /** 单页抽取 */
  page?: string | Array<string>;
  /** 二维码格式，选项：terminal|image|base64。默认terminal */
  qrFormat?: string;
  /** 二维码输出路径 */
  qrOutput?: string;
  /** 预览后的输出信息路径 */
  infoOutput?: string;
  /** 自定义编译条件 */
  compileCondition?: string;
  /** 指定生成文件目录，仅用于命令行参数 */
  'output.preview'?: string;
  /** 指定生成文件目录-标准格式 */
  output?: IOutput;
}

export interface IUploadOpts extends IParents{
  /** 上传代码时的备注 */
  desc?: string;
  /** 上传的版本号 */
  version?: string;
  /** 上传后输出信息路径 */
  infoOutput?: string;
  /** 指定生成文件目录，仅用于命令行参数 */
  'output.upload'?: string;
  /** 指定生成文件目录-标准格式 */
  output?: IOutput;
}

export interface IAuditOpts extends IParents{
  /** 指定生成文件目录，仅用于命令行参数 */
  'output.audit'?: string;
  /** 指定生成文件目录-标准格式 */
  output?: IOutput;
}

export interface INewOpts {
  /** 指定类型，组件还是页面 */
  type?: string;
  /** 页面参数 */
  name?: string;
}

/**
 * 配置文件
 */
export interface IConfigOpts {
  /** 小程序id */
  appid?: string;
  /** 小程序项目名 */
  projectname?: string;
  /** npm相关配置 */
  npm?: {
    registry?: string;
    maxRefer?: number;
  };
  /** sass文件后缀，获取依赖时优先取 */
  sassSuffix?: string;
  /** 微信小程序开发者工具cli安装路径 */
  wxcli?: string;
  /** 输出目录 */
  output?: IOutput;
  /** 多小程序配置 */
  appMap?: IAppMap;
  /** css treeshaking 白名单 TODO 补充类型 */
  purifyCSSWhiteList?: ILooseObject;
  /** webpack配置 */
  webpack?: ((ctx: IWebPackChain) => void);
  /** 插件配置 */
  plugins?: (string|[string]|[string, object])[];
}

export interface IOpts extends IConfigOpts, IBuildOpts, IPreviewOpts, IUploadOpts, IAuditOpts, INewOpts {
  /** config命令不涉及到dist */
  action: 'build' | 'audit' | 'preview' | 'upload' | 'new';
}
