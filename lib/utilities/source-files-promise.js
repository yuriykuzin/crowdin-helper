const glob = require('glob');

const configManager = require('./config-manager');


const sourceFilesPromise = new Promise((resolve, reject) => {
  glob(
    configManager.get('sourceFilesPattern'),
    null,
    (err, files) => err === null ? resolve(files) : reject(err)
  )
});


module.exports = sourceFilesPromise;
