const spawn = require('child_process').spawnSync;


const gitBranchName = spawn('git', [ 'rev-parse', '--abbrev-ref', 'HEAD' ])
  .stdout
  .toString()
  .split('\n')
  [0];

const crowdinBranchName = gitBranchName.replace(/\//g, '--');

console.log(`Crowdin: Working on git branch: ${ gitBranchName }`);


module.exports.gitBranchName = gitBranchName;
module.exports.crowdinBranchName = crowdinBranchName;
