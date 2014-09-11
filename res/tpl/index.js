var httpd = rapid.use("plugin.rapid-httpserver");
httpd.defineAction('index', function () {
    this.send('Hello World');
});