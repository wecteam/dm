/** 小程序app.json文件类型定义，不全，用到哪个补充哪个 参考:https://developers.weixin.qq.com/miniprogram/dev/reference/configuration/app.html */
export interface ISubpackages {
  /** 分包根目录 */
  root: string;
  /** 分包页面路径，相对与分包根目录 */
  pages: string[];
  /** 声明小程序需要使用的插件 */
  plugins?: {
    /** 插件版本号 */
    version: string;
    /** 插件appid */
    provider: string;
  };
}
export interface ITabBarList {
  /** 页面路径，必须在 pages 中先定义 */
  pagePath: string;
}

export interface IAppJSON {
  /** 页面路径列表 */
  pages: string[];
  /** 声明小程序需要使用的插件 */
  plugins?: {
    /** 插件版本号 */
    version?: string;
    /** 插件appid */
    provider?: string;
  };
  /** 底部 tab 栏的表现 */
  tabBar?: {
    /** tab 的列表 */
    list: ITabBarList[];
  };
  /** 分包结构配置 */
  subpackages?: ISubpackages[];
  /** 分包结构配置，写成驼峰也支持 */
  subPackages?: ISubpackages[];
  /** 分包预下载规则 */
  preloadRule?: {
    /** 页面路径 */
    [key: string]: {
      /** 在指定网络下预下载，可选值为：all: 不限网络 wifi: 仅wifi下预下载 */
      network?: string;
      /** 进入页面后预下载分包的 root 或 name。__APP__ 表示主包 */
      packages: string[];
    };
  };
  /** 全局自定义组件配置 */
  usingComponents?: Record<string, string>;
  /** 指明 sitemap.json 的位置 */
  sitemapLocation?: string;
  /** 插件功能页 */
  functionalPages?: boolean;
}
