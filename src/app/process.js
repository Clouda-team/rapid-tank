if (process.env.tankjs_worker_addons) {
    process.env.tankjs_worker_addons.split(',').forEach(require);
}

process.argv.splice(1, 1);

require(process.argv[1]);