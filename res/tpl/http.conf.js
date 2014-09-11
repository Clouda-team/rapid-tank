rapid.config.define('rapid-httpserver', {
    autoStart: true,
    loading_dir: ['/src/action'],
    defaultAction: function () {
        this.send('Cannot ' + this.request.method + this.request.url, 404);
    },
    mapping: [
        // TODO: 添加mapping，形如:
        {url: '/', doAction: 'index'}
    ]
});