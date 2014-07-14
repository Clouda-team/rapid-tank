(function (document) {

    var $apps = document.getElementById('apps');
    $apps.addEventListener('click', function (e) {
        var a = e.target;
        if (a.nodeName !== 'A' || a.target) return;
        var url = a.getAttribute('href');
        e.preventDefault();
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.send();
        xhr.onload = function () {
            notify(a, xhr.responseText, xhr.status !== 200);
        };
    });

    document.addEventListener('DOMContentLoaded', function () {
        listApps();
        document.querySelector('#refresh').addEventListener('click', listApps);
    });

    function notify(elem, text, err) {
        var $notify = document.querySelector('#notify');
        $notify.innerHTML = text;
        $notify.className = err ? 'err' : '';

        var offTop = 0, offLeft = 0;
        while (elem) {
            offTop += elem.offsetTop;
            offLeft += elem.offsetLeft;
            elem = elem.offsetParent;
        }

        $notify.style.top = offTop - 50 + 'px';
        $notify.style.left = offLeft + 'px';
        setTimeout(function () {
            $notify.className = 'hidden';
        }, 3400);
    }

    function each(obj, cb) {
        if (!obj)return;
        for (var arr = Object.keys(obj), i = 0, L = arr.length; i < L; i++) {
            var key = arr[i], val = obj[key];
            cb(key, val);
        }
    }

    function listApps() {
        var xhr = new XMLHttpRequest;
        xhr.open('GET', '/info');
        xhr.addEventListener('load', function () {
            var info = JSON.parse(xhr.responseText),
                addons = info.addons,
                now = Date.parse(xhr.getResponseHeader('Date'));
            $apps.innerHTML = info.apps.map(function (obj) {
                if (!obj)return;
                var addonHTML = '', enabled = {};
                each(obj.context && obj.context.addons, function (name, addon) {
                    enabled[name] = true;
                    addonHTML += '<p><b>' + name + '</b>';
                    each(addon.links, function (label, link) {
                        addonHTML += '<a href="/addons/' + name + link.path + '#id=' + obj.id + '" target="_blank">' + label + '</a>';
                    });

                    each(addons[name] && addons[name].started, function (label, action) {
                        addonHTML += '<a href="' + action + '?id=' + obj.id + '">' + label + '</a>';
                    });

                    addonHTML += '</p>';
                });
                each(addons, function (name, addon) {
                    if (enabled[name]) {
                        return;
                    }
                    if (addon.stopped && !obj.env.tankjs_addons.indexOf(name) + 1) { // disabled
                        addonHTML += '<p><b class="disabled">' + name + '</b>';
                        each(addon.stopped, function (label, action) {
                            addonHTML += '<a href="' + action + '?id=' + obj.id + '">' + label + '</a>';
                        });
                        addonHTML += '</p>';
                    }
                });


                return '<li><h1>' + obj.path + '</h1>' +
                    '<p><span>pid</span>' + obj.pid + '</p>' +
                    '<p><span>workers</span>' + (obj.context ? obj.context.forks | 0 : '(pending)') + '</p>' +
                    '<p><span>atime</span>' + diffTime(obj.atime, now) + '</p>' +
                    '<p><span>uptime</span>' + diffTime(obj.uptime, now) + '</p>' +
                    '<p><span><a href="/logs?id=' + obj.id + '" target="_blank">logs</a></span>'
                    + '<a href="/stop?id=' + obj.id + '">stop</a>'
                    + '<a href="/restart?id=' + obj.id + '">restart</a></p>' +
                    '<p><span>addons</span></p>' + addonHTML + '</li>';
            }).join('');
        });
        xhr.send();
    }

    function diffTime(time, now) {
        var diff = now - time;
        if (diff < 5e3) {
            return '刚刚';
        }
        if (diff < 6e4) {
            return (diff / 1e3 << 0) + 's 前';
        }
        if (diff < 6e6) {
            return (diff / 6e4 << 0) + '分钟前';
        }
        if (diff < 864e5) {
            var mins = (diff / 6e4 << 0), mm = mins % 60, hh = (mins - mm) / 60;
            return  hh + '小时' + mm + '分钟前';
        }
        return new Date(time).toLocaleString()
    }

})(document);
