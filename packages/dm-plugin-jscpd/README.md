## dm-cli 插件jscpd
扩展 dm audit命令，添加重复代码分析

### 注册的命令行参数
--jscpd：重复代码分析。  
使用示例：
dm audit --jscpd 

### 监听的事件钩子及名称
事件钩子：ctx.hooks.audit.run  
名称：DmPluginJscpd-run

### 拦截的事件钩子
无

### 对webpack配置的修改
无