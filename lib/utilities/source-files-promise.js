const glob = require('glob');

const config = require('./config');


const sourceFilesPromise = new Promise((resolve, reject) => {
  glob(
    config.sourceFilesPattern,
    null,
    (err, files) => err === null ? resolve(files) : reject(err)
  )
});


module.exports = sourceFilesPromise;
