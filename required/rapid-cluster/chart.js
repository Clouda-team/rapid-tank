(function (document, XHR) {
    var api = 'flow?' + location.hash.substr(1);
    var req = new XHR();
    req.onload = function () {
        var services = JSON.parse(req.responseText);
        document.querySelector('#charts').innerHTML = services.map(function (service) {
            var html = '<h1>address: ' + service.addr.address + ':<a href="http://'
                + location.hostname + ':' + service.addr.port + '/" target="_blank">' + service.addr.port
                + '</a></h1>';

            var max = arrMax(service.workers.map(arrMax)) || 1;

            html += '<h2>workers:</h2><div class="workers"><span>' + max + '</span>'
                + service.workers.map(function (arr) {
                    return '<div>' + arr.map(function (n) {
                        return '<i style="height: ' + (n * 100 / max) + '%"></i>';
                    }).join('') + '</div>';
                }).join('') + '</div>';

            return '<li>' + html + '</li>';
        }).join('');
    };

    function arrMax(arr) {
        return Math.max.apply(null, arr);
    }

    function update() {
        req.abort();
        req.open('GET', api);
        req.send();
    }

    update();
    setInterval(update, 4096);
})(document, XMLHttpRequest);