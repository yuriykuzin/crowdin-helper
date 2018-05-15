const spawn = require('child_process').spawnSync;

const config = require('../utilities/config');
const COLORS = require('../utilities/colors');
const CrowdinApi = require('../utilities/crowdin-api');


async function deleteOldBranches() {
  const minutesFromLastMasterMerge = _getDateDiffInMinutes(_getLastCommitToMasterDate(), new Date());

  if (minutesFromLastMasterMerge < config.minutesSinceLastMasterMergeToPurgeSafely) {
    console.log('Last merge to master was performed less than '
      + config.minutesSinceLastMasterMergeToPurgeSafely
      + ' minutes ago. It is not safe to purge crowdin branches now');

    console.log(`${ COLORS.GREEN }Please retry later${ COLORS.WHITE }`);

    process.exit(1);
  }

  const projectInfoJson = await CrowdinApi.getInfo();

  const crowdinBranches = projectInfoJson.files.filter(file => file.node_type === 'branch');
  const gitBranchesConverted = _getGitRemoteBranches().map(gitBranch => gitBranch.replace(/\//g, '--'));
  let isSomeBranchesDeleted = false;

  await Promise.all(
    crowdinBranches.map(async (branch) => {
      const daysSinceLastBranchUpdate = _getDateDiffInDays(
        new Date(_getFileLastUpdated(branch)),
        new Date()
      );

      if (
           gitBranchesConverted.indexOf(branch.name) === -1
        && daysSinceLastBranchUpdate > config.daysSinceLastUpdatedToDeleteBranchSafely
      ) {
        isSomeBranchesDeleted = true;

        await CrowdinApi.deleteBranch(branch.name)
          .then(() => {
            console.log(`Branch "${ branch.name }" is removed from crowdin`);
          })
          .catch(e => {
            console.log(`Failed to remove branch ${ branch.name } from crowdin`, e);
          });
        }
      })
  );

  if (!isSomeBranchesDeleted) {
    console.log('All branches are actual. Nothing to delete');
  }
}


function _getGitRemoteBranches() {
  const child = spawn('git', [ 'ls-remote', '--heads' ]);

  return child.stdout.toString().match(/refs\/heads\/.+/g).map(s => s.replace('refs/heads/', ''));
}

function _getFileLastUpdated(crowdinBranchObj) {
  if (crowdinBranchObj.node_type === 'file') {
    return crowdinBranchObj.last_updated;
  }

  const OLDEST_POSSIBLE_DATE = new Date(-8640000000000000);

  return crowdinBranchObj.files[0]
    ? _getFileLastUpdated(crowdinBranchObj.files[0])
    : OLDEST_POSSIBLE_DATE;         // which means never
}

function _getDateDiff(date1, date2, ms) {
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate(), date1.getHours(), date1.getMinutes());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate(), date2.getHours(), date2.getMinutes());

  return Math.floor((utc2 - utc1) / ms);
}

function _getDateDiffInDays(date1, date2) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;

  return _getDateDiff(date1, date2, _MS_PER_DAY);
}

function _getDateDiffInMinutes(date1, date2) {
  const _MS_PER_MINUTE = 1000 * 60;

  return _getDateDiff(date1, date2, _MS_PER_MINUTE);
}

function _getLastCommitToMasterDate() {
  spawn('git', ['fetch']);
  const child = spawn('git', ['log', '-1', '--format=%cd', 'origin/master']);

  return new Date(child.stdout.toString());
}


module.exports = deleteOldBranches;
