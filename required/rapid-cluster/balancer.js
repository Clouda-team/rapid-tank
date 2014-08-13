/**
 * algorithm of finding worker for reequest
 */


module.exports = function (conn, svr) {
    var workers = svr.workers;
    var idx = Math.random() * workers.length | 0;
//    console.log('dispatch request to ' + idx);
    return workers[idx];
};