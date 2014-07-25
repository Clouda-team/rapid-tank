TANK: nodejs开发与部署工具
===

TANK 是一个集应用开发、测试、部署、监控为一体的

安装
---

```sh
$ sudo npm install tankjs -g
```

使用
---

使用方式：

```sh
$ tank <command> path|pid|id  [args]
```

command为命令名称，path为启动/重启模块路径，如`/home/www/service/start.js`，pid为已启动的应用主进程pid，如`29314`，id为已启动/停止的应
用分配的id（自动分配），如`app0`。args为不同命令所接受的参数

支持的命令有：

####start:
根据指定的path启动应用。start会尝试连接守护进程并发送启动应用的参数。如果守护进程未启动，则尝试启动。如：
```sh
$ tank start /home/www/service/start.js
```
start接受的参数有：
  - -j{n} 指定worker数量，如: `-j4`。默认：4
  - --cov 启用coverage，统计代码覆盖率（安装tankjs-coverage后该参数有效)。此扩展与cluster冲突，会禁用cluster
  - --cov_all 启用coverage并统计所有文件的代码覆盖率（包括node_modules）
  - --watch={n} 设置watchdog监控间隔，单位为秒。超过该时间内应用未发送keepalive，则进程被强制重启。如：--watch=8。默认：5s
  - -u{username} 设置守护进程的控制台用户名。如果控制台已经启动，则参数无效。如：`-uroot`。默认：admin
  - -p{password} 设置守护进程的控制台密码。如：`-proot`。默认：随机生成，请到`/tmp/clouda-tankjs.out.log`中查看当前密码

####restart:
  
根据path/pid/id重启应用。如：
```sh
$ tank restart app0
```
restart接受的参数有：`-j` `--cov` `--cov_all` `--watch`，具体说明参考`start`命令

####list: 显示当前的应用列表

####ls: `list`的别名

####args: 显示命令的参数列表

####kill-daemon: 杀死守护进程

####-kd: `kill-daemon`的别名

####start-daemon: 

启动守护进程。接受`-u` 和 `-p` 参数

####-sd: `start-daemon`的别名

####test

执行单元测试。必须安装`tankjs-test`后此命令方能生效。如果未指定path，或指定的path为目录，tankjs会尝试从当前目录或指定的目录中寻找test
目录，并执行其中的js文件。
test命令支持`--cov`和`--cov_all`参数。除此之外test还支持以下参数：

  - --timeout={n} 指定单测的超时时间，单位为ms。如：`--timeout=1000`。默认：600ms
  - --report={port} 指定监听端口以输出测试结果。`tankjs-coverage`等需要浏览器访问的扩展可以通过该端口实现。如：`--report=8080`。

扩展的页面以`http://host:port/extension-name/path`形式访问，其中host为运行单测的机器地址，port为指定的端口，extension-name为扩展
名称，path为扩展的文件或接口地址。如：`http://localhost:8080/tankjs-coverage/report.html`
当启用`report`功能后，单测执行完后进程并不立即退出，需要发送ctrl-c或访问`http://host:port/exit`以退出。

  
特性
---

###高性能

单机高达 6000q/s 请求分发 (8进程)

###高兼容性

兼容clouda、Express，及任何开发框架

###Web控制台

强大的控制面板，可实时控制线上应用、监控流量


###可扩展性

完整的扩展机制，提供无限可能

###守护进程

采用看门狗式进程守护，防止应用死锁、误杀

###热部署

不终端当前请求处理情况下，重启应用

###HTTP API

支持其他语言动态控制应用（查询运行状态、动态调整进程数）

扩展机制
---

Tank 将自动识别当前module的安装目录及其子模块目录中前缀为`tankjs-`的模块，并从其`package.json`中加载扩展信息。

Tank将识别扩展的`package.json`中包含的以下字段：

###`args`: 参数

tank支持通过参数进行扩展的定制。对tank的所有命令：start stop restart reload kill-daemon start-daemon等，每个扩展可以为若干个命令
指定若干个参数。参数的指定通过在package.json中添加`args`字段实现，如：

    "args": {
        "--watch": {
            "demo": "{n}",
            "desc": "set watchdog timeout in seconds(default: 5s)",
            "commands": ["start", "restart"],
            "defaults": "5",
            "bind_env": "WATCHDOG_INTERVAL"
        }
    }

参数前面的横线与参数使用方式有关。一条横线的参数名只能有一个字符，值紧跟在名字后面，如: `-j8`；两条横线的参数名与值以`=`连接，如：
`--watch=8`。

`commands` 指定了参数相关的命令，不同的扩展可以为不同的命令指定相同的参数名，运行时当前命令不支持的参数将被忽略。

`defaults` 指定了参数的默认值。指定参数默认值的扩展将永远会被加载。

`bind_env` 指定了参数绑定的变量名，扩展的代码可以通过该环境变量读取参数的值。

###`priority`: 扩展优先级

通过在`package.json`中指定`priority`可以实现扩展的优先加载、延迟加载。扩展的默认优先级为0，priority的值类型为整数。

###`disable`: 禁用其它扩展

通过在`package.json`中指定`disable`字段可以禁用其它冲突扩展（优先级必须比该扩展高）。disable的值类型为字符串或字符串数组。

###`main`: 主要部分


一个 ***扩展*** 包含以下三部分内容：

  - master部分 扩展的部分逻辑代码，在cluster中只运行在主进程中。通过hook某些代码的执行来实现某些机制。如coverage扩展通过hook了node的模块编译过程实现了动态的覆盖率
   统计
  - main部分 运行在应用进程中的代码，如果启用了cluster，则运行在子进程中。可以与master协作实现某些功能，如cluster模块的worker部分
  hook了http server的listen函数。
  - 静态资源部分 某些扩展提供web控制台管理界面，其中的静态资源（html/js/css/图片等）由扩展提供。

###`master`: master部分

###`links`: 链接

扩展可以在控制面板中注册的服务地址，将在应用对应的扩展区域展示一个链接，地址对应一个html文件。如cluster扩展提供了一个查看请求统计的链接：
    
    "links": {
        "view flows": {
            "path": "/report.html"
        }
    }

最终链接地址形如： /addons/tankjs-cluster/report.html#id=app0

任何以`\.\w+$`结尾的请求地址将被当作静态文件，而其它接口将被当作数据请求转发给扩展。为了配合数据展示，扩展必须提供对应的HTTP服务接口。

通过在master部分代码中指定exports.requestHandler，当扩展的web界面发布请求时（请求地址前缀必须与静态文件相同，且包含id参数，
如`/addons/tankjs-cluster/flows?id=app0`），请求将被转发至reequestHandler接口。

requestHandler接受两个参数：req和res，其中req的地址被改写成形如`/flows`的短链接。接口形如：

    exports.requestHandler = function (req, res) {
        res.end(JSON.stringify(files));
    };


###`actions`: 行为

除了展示链接，扩展可以定义某些支持的行为，如cluster扩展支持reload和动态调整worker数。行为定义方式为：

    "actions": {
        "started": {
            "reload": "/reload",
            "workers++": "/inc_workers",
            "workers--": "/dec_workers"
        }
    }

其中`started`和`stopped`分别代表扩展启用或禁用时显示的行为。action对应的链接地址形如：/reload?id=app0。


Tank支持的行为有：

  - stop 停止服务
  - restart 重启服务
  - restart/with-addon-name 重启服务并激活addon
  - restart/without-addon-name 重启服务并禁用addon

###`startup`: 启动入口

一些扩展（如cluster、单元测试等）可以替代默认的启动入口，从而实现某些特定行为。当startup为true时，Tank将在加载完全部扩展的master模块后，执行
该扩展的master模块的startup函数。
