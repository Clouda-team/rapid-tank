TANK: nodejs开发与部署工具
===

[![NPM version](https://badge.fury.io/js/tankjs.svg)](http://badge.fury.io/js/tankjs)

TANK 是一个集应用开发、测试、部署、监控为一体的nodejs应用执行框架

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
  - --report={port} 指定监听端口以输出测试结果。`tankjs-coverage`等需要浏览器访问的扩展可以通过该端口实现。如：`--report=8080`。默认：随机分配

扩展的页面以`http://host:port/extension-name/path`形式访问，其中host为运行单测的机器地址，port为指定的端口，extension-name为扩展
名称，path为扩展的文件或接口地址。如：`http://localhost:8080/tankjs-coverage/report.html`
当启用`report`功能后，单测执行完后进程并不立即退出，需要发送ctrl-c或访问`http://host:port/exit`以退出。

  
特性
---

###高性能

单机高达 6000q/s 请求分发 (8进程)

###高兼容性

兼容clouda、Express等任何开发框架

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

官网
---

访问 [clouda+官网](http://cloudap.duapp.com/)获得更多信息