dm-cli
====
用于前端项目的脚手架，内置一套集 gulp 工作流、文件(函数）依赖分析、npm 包分析及下载、npm 构建为一体的小程序开发插件

## 安装
`npm install -g @wecteam/dm-cli`


## ChangeLog
详见[ChangeLog](CHANGELOG.md)

## 加入开发
* [开发指引](CONTRIBUTING.md)  
* [插件开发指南](docs/PLUGIN-GUIDE.md)

## 使用说明
`dm`查看子命令说明
```
Usage: dm <command> [options]

Options:
  -V, --ver  output the version number
  -h, --help     output usage information

Commands:
  build|b        小程序编译
  new|n          新建页面或组件
  preview|p      预览小程序，生成二维码
  audit|a        项目审计
  config|c <cmd> 用户级配置
  help [cmd]     display help for [cmd]
```
`dm help [cmd]` 查看子命令参数，如：`dm help new`
```
Usage: dm new [options]

Options:
  -t, --type [value]  新建类型(page|component)
  -n, --name [value]  名称
  -h, --help          output usage information
```

## 命令说明

### 小程序编译：dm build
`dm build` build 命令会依次做 wxss 转换、文件分析、npm 下载、npm 构建等(详见设计文档)，并最终生成 dm-build 目录作为小程序开发目录。  

* 参数 --page|-p 单页抽取，仅提取指定页面需要的文件(多个使用英文逗号分隔)，可以提升开发效率，**支持使用配置文件** 。  
`dm build -p pages/index/index,pages/seckill/index/index`   
```
以下是单页抽取各场景数据对比  

          常规开发   单页抽取
预览耗时    100s     15s
启动耗时    25s      10s
编译耗时    5s       3s
``` 

* 参数 --watch|-w 启动watch模式，注意文件过多时watch会比较慢，注意配合单页抽取一起使用。  
`dm build -w`   

* 参数 --tabbar 在单页抽取时，保留原生 tab 及 tab 上的页面。  
`dm build -p pages/seckill/index/index --tabbar` 


* 参数 --app|-a 条件编译，用于同一个工程下存在多个 app 情况，app 参数用于指定要编译哪个 app。
`dm build -a b` 

* 参数 --type|-t 条件编译，用于同一个工程下存在多端同构的代码。 参数用于指定要编译哪个场景。
`dm build -t h5`  

* 参数 --open|-o 自动启动小程序开发者工具加载编译生成目录(dm build)。  
`dm build -o`
> 调用小程序开发者工具需要指定 CLI 路径，详见参数 --wxcli 。

* 参数 --wxcli 指定微信开发者工具 CLI 路径，详见[命令行](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)。macOS默认值为：/Applications/wechatwebdevtools.app/Contents/MacOS/cli，win默认值为空，**支持使用配置文件**。  
`dm build --wxcli "D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat"`

* 参数 --include|-i 需要额外拷贝的文件，参数值使用glob模式。  
`dm build -i "assets/*.png"`

* 参数 --output.build|-d 指定命令生成的目标目录，默认为当前项目的平级目录 dm build 即：../dm build，可使用绝对路径，使用相对路径时，参照路径为 CLI 执行目录。  
`dm build -d "../../dm build"`，
> 与参数 --app 同时使用时，会在目标目录后加上附加 -{app} 作为区分，如 dm build -d ../../dm build -a b 生成的目录为 dm-build-b
> 与参数 --type 同时使用时，会在目标目录后加上附加 -{type} 作为区分，如 dm build -d ../../dm build -a b -t h5 生成的目录为 dm-build-b-h5

* 参数 --release|-r  发布模式，可进行文件压缩、文件修改等操作。 可选用 @wecteam/dm-plugin-minify 插件进行压缩。
`dm build -r`

* 参数 --version|-v  结合-r参数一起使用，指定版本号，一般用于发布。   
`dm build -r -v 2.0.0`

* 参数 --js-tree-shaking 函数依赖分析，编译后的目录中，删掉js文件中未使用的函数。  
`dm build --js-tree-shaking`

* 参数 --css-tree-shaking 删除无用样式 注：尚在实验阶段 ，未经过完整测试(可能会删掉有用的样式)，可以使用此参数并借助 Beyond Compare 等对比工具对比删掉的样式。上线前务必做好验证。  
`dm build --css-tree-shaking`

### 新建页面|组件：dm new
`dm new`  new 命令会在当前目录下创建小程序页面或组件所需的文件，以下参数再不指定时，会通过询问的方式提示用户选择。
* 参数 --type|-t 可选值：page、component ，表示需要创建页面还是组件。  
`dm new -t page`

* 参数 --name|-n 页面或者组件名字(文件名)。  
`dm new -n index`

### 小程序预览：dm preview
`dm preview` preview 命令会调用小程序开发者工具的 CLI，在控制台打印二维码。

> 若预览提示有文件未找到，但实际文件存在时，请尝试先关闭小程序开发者工具，再执行预览命令。

* 参数 --qr-format|-f 详见[命令行](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)，下同  
`dm preview -f terminal`

* 参数 --qr-output|-o  
`dm preview -n /path/to/qrcode.txt -f base64`

* 参数 --info-output|-i  
`dm preview -i /path/to/preview-info.json`

* 参数 --compile-condition|-q   
`dm preview -q  '{"pathName":"pages/index/index"}'`

* 参数 --page|-p  同 dm build 参数
* 参数 --app|-a 同 dm build 参数
* 参数 --output.preview|-d 预览命令文件生成目录，默认值为：../dm-build

### 小程序上传：dm upload
`dm upload` upload 命令会调用小程序开发者工具的 CLI，上传代码。

* 参数 --desc 详见[命令行](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)，下同  
`dm upload --desc "upload by dm"`

* 参数 --version|-v    
`dm upload -v 1.0.0`

* 参数 --info-output|-i  
`dm upload -i /path/to/upload-info.json`

* 参数 --app|-a 同 dm build 参数
* 参数 --output.upload|-d 预览命令文件生成目录，默认值为：../dm-build

### 小程序审计：dm audit
`dm audit` 使用audit命令默认会执行两个功能，一是分析项目中的文件依赖关系，输出优化建议；若需要进行重复代码分析，请添加插件@wecteam/dm-plugin-jscpd。  
 
* 参数 --app|-a 同 dm build 参数
* 参数 --output.audit|-d audit命令输出目录，默认值为：../dm-audit

### 全局配置：dm config
`dm config` 用于设置全局的用户配置，类似 npm config ，配置保存在操作系统的当前用户根目录下，目前的主要配置项为 wxcli（微信小程序 IDE 命令行工具安装路径）。
```
使用方式:
  $ dm config set <key> <value>
  $ dm config get [key]
  $ dm config delete <key>
  $ dm config list
```
* 子命令 list 控制台打印当前所有全局配置项  
`dm config list`

* 子命令 set 设置对应配置项的值，需要传递 key 和 value 两个参数，如下。当value中有特殊字符时(空格、斜杠等)，带上双引号。  
`dm config set wxcli "D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat"`

* 子命令 get 获取对应配置项的值，需要指定 key。不指定时与子命令 list 等价  
`dm config get wxcli`

* 子命令 delete 删除对应配置项，需要指定 key  
`dm config delete wxcli`



## npm包支持
dm-cli 对 npm 的支持基于官方提供的能力[npm支持](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)。在这个基础上添加了低版本兼容及智能分包能力。
### 使用需知
1、`安装依赖` 在项目根目录 package.json 中的 `dependencies` 字段指明依赖并进行安装，注意为了确保代码稳定可控，依赖需要使用精确的版本(即使用1.0.0不要使用`^`1.0.0这种范围性的)，或者直接使用npm install {name} -E 来安装并自动添加精确版本依赖。  
2、`代码中使用` 跟常规npm使用一样，直接 import {xx} from '@wecteam/xx' 即可。 


### dm-cli编译npm流程
1、`检查npm包` 检查 package.json 中指定的版本号与当前 node_modules 中安装的包版本是否匹配，若不匹配，则会自动安装。若提前安装好了，此步骤将跳过。
2、`npm包适配` 对部分三端同构的基础库进行小程序端适配。  
3、`构建npm` 调用微信开发者工具CLI执行`构建npm`，将当前项目依赖的npm包转成 `miniprogram_npm` 目录。若已经构建过了，此步骤将跳过。
> 若构建npm步骤报错，请确保你当前的配置是否有指定正确的微信cli路径，详见本文档wxcli参数说明，建议使用 `dm config` 进行配置。

4、`低版本兼容` 由于 npm 支持需要基础库版本 2.2.1 或以上，为了兼容低版本，编译后会将源码中 npm 引入（import {xx} from '@wecteam/xx'） 修改成相对路径引入（import {xx} from '../../miniprogram_npm/@wecteam/xx'）。  
5、`智能分包` 根据依赖分析动态拷贝 miniprogram_npm 文件到对应目录，比如一个 npm 包仅被一个子包引用，则会在子包目录生成一个 miniprogram_npm 目录。智能分包的过程中会自动修改miniprogram_npm/@wecteam/xx 的相对关系。


## 配置文件
配置文件支持公有配置`dm.config.js`和私有配置`dm.config.profile.js`，私有配置文件优先级大于共有配置，放在在小程序根目录即可,目前可配置的选项如下:
```js
module.exports = {
  // 微信开发者工具CLI安装路径，macOS默认值:/Applications/wechatwebdevtools.app/Contents/MacOS/cli，win无默认值。建议使用dm config配置。
  wxcli: 'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat',
  output: {
    build: path.resolve('../dm-build'), // dm build 命令的文件生成目录，默认为 ../dm-build
    audit: path.resolve('../dm-audit') // dm audit 命令的文件生成目录，默认为 ../dm-aduit
  },
  // 单页抽取，支持数组和字符串形式。一般写在私有配置中。
  page: ['pages/index/index', 'pages/my/index'], // 或者，page:'pages/index/index,pages/my/index'
  /**
   * 修改编译过程的webpack配置
   * @param chain webpack-chain
   */
  webpack (chain: IWebPackChain): void {},
  /**
   * 添加插件配置
   * (string|[string]|[string, object])[]
   */
  plugins:[]
}
```

## 常见问题

### win系统[构建npm]步骤报错
小程序 CLI 执行过程中，需要调用微信开发者工具 CLI 接口，因此需要指定其安装路径，macOS 下安装路径比较固定，指定了默认值(详见上述)，但 win 下安装路径众多，没有指定默认值，因此 win 下需要使用参数 --wxcli 或者配置文件 dm.config.js 指定微信开发者工具 cli.bat 路径，安装路径参考：[命令行](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html)

### WARNING
命令执行后会生成一份 buid.log 日志文件，里面会有一些日志信息  
1:WARNING 一般是 import的内容在对应文件中没有 export  
`WARNING in ./pages/my_pages/coupon/coupon.js 1:9063-9077 "export 'verifyAuthUser' was not found in 'common.js'`  
2:ERROR 一般是找不到文件，一般是路径写错了，如多写了一个 ../，在微信开发者中工具中，是兼容这种情况的(不论写多少个../，最终会指向 app 根目录)  
`ERROR in ./pages/recharge/index.json Module not found: Error: Can't resolve '../../../components/quick-nav/quick-nav' `  
3:以上两种情况均不影响编译结果，可以借此规范代码。
