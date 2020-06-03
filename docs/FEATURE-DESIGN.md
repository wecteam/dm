# 概要设计

## 一.目标
随着小程序的火爆，参与小程序开发的团队越来越多，项目也越来越大，虽然微信官方提供了针对小程序开发的[小程序IDE](https://developers.weixin.qq.com/miniprogram/dev/devtools/devtools.html)，但在实践中基本上仅在调试和打包阶段使用它，一方面是小程序IDE功能比较弱，离程序的现代编辑器如VS Code、Sublime等的功能差距巨大，另一方面我们是小程序IDE在工程化支持上确实存在一些足，比如：

* 对JavaScript语言超集（TypeScript，Flow）、CSS预处理器（SASS、Less、Stylus）支持不够。其中CSS预处理器基本上是现代前端开发的必备利器，小程序IDE却完全不支持；TypeScript虽然支持，但是使用起来很别扭。
* 小程序项目规模变大时候，小程序IDE启动很慢，影响效率.
* 缺乏依赖分析。随着小程序项目的迭代，存在一些废弃的文件或者函数，占用小程序本来就紧张的空间。
* NPM包使用不友好。NPM包是前端代码复用机制的基石，但是[小程序IDE下使用NPM需要手工编译NPM](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)，使用有些啰嗦。
* 小程序的分包策略完全依赖人工分配，可能一些仅子包使用的文件却被放在主包，或者多个子包使用的文件却每个子包都有一份。
* 小程序规模增大之后，代码慢慢变坏，存在很多重复的文件、函数、代码片段等。
* 同一个项目生成多个不同的小程序。

等等问题是小程序IDE并不能解决的。因此，DM CLI的目标是对微信小程序IDE能力进行补充，将小程序开发的工具链进行标准化，并形成一系列最佳实践供选择，让开发者基于默认的配置即可达到最优而不用纠结各种配置问题，同时解决小程序规模增大后的各种质量和性能问题。

目前我们团队在小程序工程化积累了丰富的经验，并研发了自己的小程序CLI工具，因此我们的主要事项是在已有CLI能力的基础上进行抽象和抽取，并开源出来，共同促进业界小程序开发效率的提升！

## 二.功能设计
在讨论CLI的特性前，我们应该先明确其边界：
1. 小程序IDE已有的能力，我们不重复做。
2. 通过其他开源工具简单配置即可实现的，我们也不做，比如ESLint。
3. 多端框架做的事情，我们也不做，比如Taro。
我们要做的，应该是解决其他工程工具没有考虑到的、又是小程序工程中切实存在的问题。

基于以上原则，在丰富的实践经验的基础上，我们认为，小程序CLI应该具备以下能力：
1. 多种JS语言超集/CSS预处理器支持

	如前面所述，现代前端开发基本上都会使用TypeScript、Flow等JS语言超集和SASS、Less、Stylus等CSS预处理器，dm CLI应该对于予以完整的支持。

2. 更好的NPM支持

	更好的NPM支持包括：
	1. 动态生成package.json。即使用npm包无需事先安装，直接在代码引用即可，CLI会分析依赖关系并动态生成package.json。
	2. 依赖动态下载和构建。动态下载依赖的NPM包，并调用[小程序DE的构建命令](https://developers.weixin.qq.com/miniprogram/dev/devtools/cli.html#%E8%87%AA%E5%8A%A8%E9%A2%84%E8%A7%88)进行预处理。
	3. 低版本的NPM支持。在低版本微信下并不支持NPM包，需要转换处理。

3. 编译指定页面

	开发页面的时候，可以支持编译指定的页面，尽可能少的减少要编译的代码，提升IDE启动速度和开发体验，并提供Hot Reload支持。

4. 依赖分析

	依赖分析主要是解决打包后的项目代码中的用了一些废弃的文件，或者打包了根本用不上的函数的问题，这些文件或者函数会占用本来就紧张的小程序空间。主要包括文件依赖分析和函数依赖分析。

5. 智能分包

	目前分包策略是完全手工配置的，有可能某些文件或者组件仅在某些子包中用到，但却放在公共目录下最后打包到主包中。智能分包主要是分析文件和npm包的引用关系，按照某种算法，决定文件和npm包是放在主包中还是子包中。

6. 静态扫描

	静态扫描主要是解决形如使用了比较大的图片、A子包使用了B子包中的文件等问题，保证代码和工程的质量，且这些问题是lint工具（如ESLint）并不能解决的。
	
7. 项目审计

	类似于npm audit命令，主要是对小程序代码的质量进行分析，包括两种：
	1. 分包不合理的文件、函数、样式、模板等。
	2. 重复的文件、函数、样式、模板等。

8. 多小程序支持

	支持一个小程序项目生成多个不同的小程序，这个在很多大型团队是非常常见的需求。 

9. 小程序插件支持

	支持对小程序插件场景的编译处理。 


上述功能中，第1、2、3主要是针对开发阶段，第4、5针针对打包阶段，第6、7主要是保证代码质量，第8、9点属于特殊场景支持。

## 三.配置设计
在讨论具体的配置之前，我们应该先明确CLI应该如何实现。
我们认为：小程序CLI应该基于Webpack来实现。Webpack是现代前端工程化的利器，基于Webpack实现可以充分利用其庞大的生态，更好的跟开源世界对接，虽然他本身主要是面向Web应用的，但是进行封装之后支持小程序是完全没有问题的。

整体上讲，小程序CLI的配置文件应该分成三个级别：
1. 全局级。这个主要是全局公用的配置项，多个小程序项目可以共用，仅配置一次即可，文件存放在操作系统的当前用户根目录下，目前的主要配置项为wxcli（微信小程序IDE命令行工具安装路径）。
2. 项目级。用于存放当前项目的配置，包括output（编译输出的目标目录）、webpack(webpack的配置)、branchPolicy(智能分包策略)等配置项，文件名为dm.config.js。此文件会纳入到Git的版本管理，一般设置好了之后就很少修改。
3. 用户级。用户存放项目下用户的个性化配置，目前的主要配置项为page（指定编译的页面），文件名为dm.config.profile.js。此文件不会纳入到Git的管理，用户会经常修改。
以上三个配置文件的配置项最终会做合并，配置项的优先级为用户级>项目级>全局级,即若用户级和项目级的配置文件配了相同的配置项，则前者优先级更高。

小程序CLI是基于Webpack来开发，但是小程序有其独有的特性，因而Webpack的配置是受限的（比如小程序项目的entry字段固定为app.json，就不能配置），经过分析，能够开放的字段主要为module、plugins、stats三个配置字段，详见WEBPACK-CONFIG.md的分析。

小程序CLI的主要配置为：
```JavaScript
module.exports = {
	// 微信开发者工具CLI安装路径，macOS默认值:/Applications/wechatwebdevtools.app/Contents/MacOS/cli，win无默认值
	wxcli: 'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat'
	appId:"",//项目级配置。创建小程序时的appId，此参数在调用小程序IDE的API时传递给project.config.json文件(https://developers.weixin.qq.com/miniprogram/dev/devtools/http.html)；在项目支持多个小程序的场景（后面简称多小程序场景），此appId会作为没有匹配到appKey的默认appId。
	appName:"xxx",//项目级配置。默认的小程序项目名称，可以按照情况命名即可，传递给小程序IDE使用，在多小程序场景，此appName会作为没有匹配到appKey的默认appName
	output:{//项目级配置。
		build:"../dm-build",//执行dm build命令时候编译的输出目录，../dm-build，在多小程序场景，具体的输出目录会在此目录名字上加上appKey
		audit:"../dm-audit"//执行dm audit命令时候编译的输出目录，../dm-audit，在多小程序场景，具体的输出目录会在此目录名字上加上appKey
	},
	appMap:{//项目级配置。用于配置在多小程序场景下的映射表，其中appKey用来标识不同小程序，区分后缀的时候会使用appKey。
  		appKey:{
  			appId:"",
  			appName:""
  		}
  	}
	page:['pages/index/index','pages/h5/index']//用户级配置。指定编译的页面，可以是数组或者字符串(多个页面使用英文逗号分隔)
}
```

## 四.命令设计
命令应该包含小程序开发整个周期的支持。

1. dm init 
	此命令主要用初始化项目，核心特性包括。
	* 创建目录
	* 初始化项目配置，包括appId，appName，output等。
	* 选择插件集
	* 安装初始的依赖


2. dm build
build命令会依次调用webpack的loader和plugin、依赖分析、npm下载、npm 构建等，并最终生成 dm-build 目录作为小程序开发目录。
	* 参数 --watch|-w 启动watch模式。

	* 参数 --no-deps|-n 由于依赖分析过程有点慢，此参数表明不做依赖分析，配合--watch直接启动 watch 模式。

	* 参数 --page|-p 单页抽取，仅提取指定页面需要的文件(多个使用英文逗号分隔)，可以提升开发效率，支持使用配置文件 。
	dm build -p pages/index/index,pages/seckill/index/index

	* 参数 --tabbar 在单页抽取时，保留原生 tab 及 tab 上的页面。
	dm build -p pages/seckill/index/index --tabbar


	* 参数 --app|-a 条件编译，用于同一个工程下存在多个 app 情况，app 参数用于指定要编译哪个 app，详见小程序 CLI 多应用支持
	dm build -a b

	* 参数 --open|-o 自动启动小程序开发者工具加载编译生成目录(dm-build)。
	dm build -o
	调用小程序开发者工具需要指定 CLI 路径，详见参数 --wxcli 。

	* 参数 --wxcli 指定微信开发者工具 CLI 路径，详见命令行。macOS默认值为：/Applications/wechatwebdevtools.app/Contents/MacOS/cli，win默认值为空，支持使用配置文件。dm build --wxcli 'D:\\Program Files (x86)\\Tencent\\微信web开发者工具\\cli.bat'。传递此参数是会覆盖掉配置文件中wxli配置项。

	* 参数 --output.build|-d 指定命令生成的目标目录，默认为当前项目的平级目录 dm-build 即：../dm-build，可使用绝对路径，使用相对路径时，参照路径为 CLI 执行目录。
	dm build --output.build '../../dm-build'
	与参数 --app 同时使用时，会在目标目录后加上附加 -{app} 作为区分，如 dm build -d '../../dm-build -a b 生成的目录为 dm-build-b

	* 参数 --release|-r  发布模式，添加文件压缩、文件修改等操作。
	dm build -r

	* 参数 --version|-v  指定版本号 修改 app.js 中的 version 字段。
	dm build -v 2.0.0

	* 参数 --dev 打包开发版本，app.js 中的 version 字段添加 alpha 标识。
	dm build --dev

	* 参数 --tree-shaking|-t 函数依赖分析，编译后的目录中，删掉js文件中未使用的函数。
	dm build -t 

	* 参数 --css-tree-shaking|-c 删除无用样式 注：尚在实验阶段 ，未经过完整测试(可能会删掉有用的样式)，可以使用此参数并借助 Beyond Compare 等对比工具对比删掉的样式。上线前务必做好验证。


3. dm new
新建页面|组件。 new 命令会在当前目录下创建小程序页面或组件所需的文件，以下参数再不指定时，会通过询问的方式提示用户选择。

	* 参数 --type|-t 可选值：page、component，表示需要创建页面还是组件。
dm new -t page



	* 参数 --name|-n 页面或者组件名字(文件名)。
	dm new -n index



4. 小程序预览：dm preview
dm preview 命令会调用小程序开发者工具的 CLI，在控制台打印二维码。
若预览提示有文件未找到，但实际文件存在时，请尝试先关闭小程序开发者工具，再执行预览命令。
	* 参数 --path-name|-n 表示需要预览的小程序的启动页面，不填表示首页(app.json 中注册的第一个页面)。
dm p -n /pages/index/inndex
	* 参数 --query|-q  表示启动页面的参数。
dm p -n /pages/index/inndex -q debugChannel=httpDirect&sense=1
	* 参数 --page|-p  同 dm build 参数
	* 参数 --app|-a 同 dm build 参数
	* 参数 --output.dev|-d 同 dm build 参数，默认值为：../dm-build


5. dm audit
小程序审计。dm audit 使用audit命令默认会执行三个功能，一是分析项目中的文件依赖关系，输出优化建议；二是调用 jscpd 分析所有代码，识别重复代码，并输出结果；三是做静态扫描，分析代码中不符合规则的部分。


	* 参数  --only-check-package|-ocp 仅分析项目中的文件依赖关系，输出优化建议。
	dm audit --only-check-package


	* 参数  --only-check-duplicate|-ocd 仅识别重复代码，并输出结果。
	dm audit --only-check-duplicate

	* 参数  --only-static-scan|-oss 仅做静态扫描，并输出结果。
	dm audit --only-static-scan

	* 参数 --app|-a 同 dm build 参数

	* 参数 --dist|-d 同 dm build 参数，默认值为：../dm-audit



6. dm config
	配置小程序全局的配置项。
	* set {item} 设置小程序全局配置项，目前仅支持 set wxcli {cli路径}
	* get {item} 读取小程序全局配置项。
	* list 展示所有全局配置项。
	* delete {item} 删除配置项。

7. dm update 
	更新 CLI 本身版本

## 五.重点特性的实现思路

1. 插件集（预设）

	前面说到了，小程序CLI基于Webpack来实现，并且我们的目标也是形成一系列最佳实践。那么最佳实践如何体现呢？

	在Babel生态中，有一个很好的概念叫做[preset](https://babeljs.io/docs/en/next/presets)，直译为预设，但是意译为插件集更合适，这个其实就是最佳实践的代码体现形式，灵活且可扩展。可惜在Webpack生态中缺乏这个概念及实现，但是我们可以基于这种思路自己实现一套插件集。

	在Webpack中配置最麻烦的就是loader和plugin，我们可以在实践的基础之上，把loader和plugin的组合做成可以共享的配置，并配合完善丰富的文档，小程序CLI基于这些配置直接生成webpack的配置，用户可以直接选择使用这些共享的配置，省去自己配置的麻烦。这些共享的配置便是基于Webpack的插件集，也即我们提到的最佳实践。基于Webpack的插件集可以以NPM包的形式进行共享。

	在项目初始化执行dm init命令的时候，会提示用户选择哪个插件集。

2. 依赖分析

	（待添加）

3. 智能分包

	（待添加）

4. 多小程序支持

	（待添加）

5. 项目审计：静态扫描

	静态扫描的规则通ESlint的规则还不一样，后缀仅仅是一个语法层面的事情，目前已经有成熟的机制，包括规则配置和扫描机制。但是小程序的静态扫描如何实现，是一个很值得研究的问题，包括规则配置和扫描实现。

6. 项目审计：文件分包合理性分析

	（待添加）


7. 项目审计：重复代码检测

	（待添加）

## 六.开发规范
参见[开发指引](CONTRIBUTING.md)

## 七.待开发特性
参见[开发计划](PLANS.md)

## 八.待讨论点
1. 静态扫描规则及实现？
