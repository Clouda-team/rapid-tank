RAPID-TESTER
===

`rapid-tester`是`rapid-tank`的test命令的扩展，实现了mocha风格的测试脚本的支持，并支持TANK的扩展加载机制

安装
---

```sh
$ sudo npm install rapid-tank -g
```

使用
---

###创建测试目录

在当前项目文件夹下创建test目录，并编写单测代码（使用mocha风格）：

```js
describe('test title', function () {
    it('unit name', function (next) {
        doSomething.done(next);
    });
});
```

###执行测试

```sh
$ rapid test
```

###加载其它组件

您可以选择性加载其它组件，如tankjs-coverage。使用--report参数来启动一个http服务：

```sh
$ rapid test --cov --report=8080
```

访问地址：`http://hostname:8080/rapid-coverage/report.html`以查看覆盖率结果

官网
---

访问 [clouda+官网](http://cloudaplus.duapp.com/)获得更多信息
