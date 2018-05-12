const unzipper = require('unzipper');
const glob = require('glob');
const fs = require('fs');
const spawn = require('child_process').spawnSync;

const config = require('./config');
const COLORS = require('./colors');
const crowdinFetch = require('./crowdin-fetch');


const sourceFilesPromise = _getSourceFiles();

const gitBranchName = _getGitBranchName();
const crowdinBranchName = gitBranchName.replace(/\//g, '--');

console.log(`Crowdin: Working on git branch: ${ gitBranchName }`);


async function downloadTranslations(shouldIgnoreUnmergedMaster = false) {
  if (
       !shouldIgnoreUnmergedMaster
    && !(await _isLastSourceFilesFromMasterMergedIntoCurrent())
  ) {
    console.log(`Crowdin: ${ COLORS.RED }Please merge last master into your branch and upload sources to crowdin `
      + `before attempting to download last translations${ COLORS.WHITE }`);

    process.exit(1);
  }

  console.log('Crowdin: Uploading sources before downloading');
  await uploadSources();

  console.log('Crowdin: Triggering branch build before downloading');
  await crowdinFetch(`export`, { branch: crowdinBranchName });

  console.log('Crowdin: Downloading branch', crowdinBranchName);

  return await crowdinFetch(`download/all.zip`, { branch: crowdinBranchName }, false)
    .then(res => {
      res.body.pipe(unzipper.Parse())
        .on('entry', (entry) => {
          if (entry.type === 'File') {
            const fileName = entry.path.replace(crowdinBranchName, '').replace(/^\//, '');

            entry.pipe(fs.createWriteStream(fileName)
              .on('finish', () => {
                console.log(`Crowdin: ${ COLORS.GREEN }Unzipped ${ fileName } ${ COLORS.WHITE }`);
              }));

            return;
          }

          entry.autodrain();
        })
        .promise()
        .catch((e) => {
          console.log(`Crowdin: ${ COLORS.RED }Unzipping failed. Probably broken ZIP file${ COLORS.WHITE }`);
          console.log(e);
        });

    });
}

async function uploadSources(shouldExitIfSourceFileWasNotChanged = false) {
  const files = await sourceFilesPromise;

  if (shouldExitIfSourceFileWasNotChanged && _isEverySourceFileSameAsInMaster(files)) {
    console.log(`Crowdin: Source files are unchenged. Nothing to upload`);

    return;
  }

  console.log(`Crowdin: Uploading to branch: ${ crowdinBranchName }`);

  const isBranchNewlyCreated = await crowdinFetch('add-directory', {
    name: crowdinBranchName,
    is_branch: '1'
  })
    .then(json => json.success);

  await Promise.all(
    files.map(async filePath => {
      const findDirName = filePath.match(/(.+?)\/[^\/]+$/);

      if (findDirName) {
        await crowdinFetch('add-directory', {
          name: findDirName[1],
          branch: crowdinBranchName,
          recursive: '1'
        });
      }

      const fileNameKey = 'files[' + filePath + ']';
      const exportPatternsKey = 'export_patterns[' + filePath + ']';

      // We assume, that file is already there is branch was already existed
      // If, not and therefore 'update-file' failes, we'll perform 'add-file' then
      const updateFileMethod = isBranchNewlyCreated
        ? 'add-file'
        : 'update-file';

      const response = await crowdinFetch(updateFileMethod, {
        [fileNameKey]: fs.createReadStream(filePath),
        [exportPatternsKey]: config.translationPattern,
        branch: crowdinBranchName
      })
        .then(json => {
          if (json.error && json.error.code === 8) {
            // File was not found

            return crowdinFetch('add-file', {
              [fileNameKey]: fs.createReadStream(filePath),
              [exportPatternsKey]: config.translationPattern,
              branch: crowdinBranchName
            });
          }

          return json;
        });

      if (response.success) {
        console.log(`Crowdin:${ COLORS.GREEN } ${ filePath } is uploaded ${ COLORS.WHITE }`);
      }
    })
  );

  await triggerAutoTranslation();
}

function checkProgressOnBranch() {
  if (crowdinBranchName === 'master') {
    // Let's trigger auto-translate since it is probably a run on Semaphore or other CI tool
    triggerAutoTranslation('master');

    console.log(`Crowdin: ${ COLORS.GREEN }No validation performed since it is a master branch${ COLORS.WHITE }`);

    return;
  }

  console.log('Crowdin: Checking language:', config.languageToCheck);

  crowdinFetch('language-status', { language: config.languageToCheck })
    .then(json => {
      const currentBranch = json.files.filter(file => {
        return file.node_type === 'branch'
            && file.name === crowdinBranchName;
      })
        [0];

      if (!currentBranch) {
        console.log(`Crowdin: ${ COLORS.GREEN }Okay, no such branch on crowdin${ COLORS.WHITE }`);

        return;
      }

      if (currentBranch.phrases === 0) {
        console.log(`Crowdin: ${ COLORS.GREEN }Okay, no new phrases in this branch${ COLORS.WHITE }`);

        return;
      }

      if (currentBranch.translated === currentBranch.phrases) {
        console.log(`Crowdin: ${ COLORS.GREEN }Okay, translations are ready${ COLORS.WHITE }`);

        return;
      }

      console.log(`Crowdin: translated ${ currentBranch.translated } / ${ currentBranch.phrases }`);
      console.log(`Crowdin: ${ COLORS.RED }Error: There are some missing translations${ COLORS.WHITE }`);

      process.exit(1);
    });
}

async function triggerAutoTranslation() {
  if (config.disableAutoTranslation) {
    console.log(`Crowdin: Auto-translation is disabled by "crowdin-helper.json"`);

    return;
  }

  console.log(`Crowdin: Triggering auto-translation of a branch: ${ crowdinBranchName }`);

  const sourceFilesWithBranchName = (await sourceFilesPromise)
    .map(fileName => crowdinBranchName + '/' + fileName);

  crowdinFetch(
    'pre-translate',
    {
      'languages': config.languagesToAutoTranslate,
      'files': sourceFilesWithBranchName,
      'method': 'tm',
      'apply_untranslated_strings_only': 1,
      'perfect_match': 1
    }
  )
    .then((json) => {
      if (!json.success) {
        console.log(`Crowdin: ${ COLORS.RED }Error:`);
        console.log(json, COLORS.WHITE);
      }
    })
    .catch(e => {
      console.log(`Crowdin: ${ COLORS.RED }Error: Failed to auto-translate branch ${ branch.name }${ COLORS.WHITE }`);
      console.log(`Original error: ${ e }`);
    });
}

async function deleteOldBranches() {
  const minutesFromLastMasterMerge = _getDateDiffInMinutes(_getLastCommitToMasterDate(), new Date());

  if (minutesFromLastMasterMerge < config.minutesSinceLastMasterMergeToPurgeSafely) {
    console.log('Last merge to master was performed less than '
      + config.minutesSinceLastMasterMergeToPurgeSafely
      + ' minutes ago. It is not safe to purge crowdin branches now');

    console.log(`${ COLORS.GREEN }Please retry later${ COLORS.WHITE }`);

    process.exit(1);
  }

  const projectInfoJson = await crowdinFetch('info');

  const crowdinBranches = projectInfoJson.files.filter(file => file.node_type === 'branch');
  const gitBranchesConverted = _getGitRemoteBranches().map(gitBranch => gitBranch.replace(/\//g, '--'));
  let isSomeBranchesDeleted = false;

  crowdinBranches.forEach((branch) => {
    const daysSinceLastBranchUpdate = _getDateDiffInDays(
      new Date(_getFileLastUpdated(branch)),
      new Date()
    );

    if (
          gitBranchesConverted.indexOf(branch.name) === -1
      && daysSinceLastBranchUpdate > config.daysSinceLastUpdatedToDeleteBranchSafely
    ) {
      isSomeBranchesDeleted = true;

      crowdinFetch('delete-directory', { name: branch.name })
        .then(() => {
          console.log(`Branch "${ branch.name }" is removed from crowdin`);
        })
        .catch(e => {
          console.log(`Failed to remove branch ${ branch.name } from crowdin`, e);
        });
    }
  });

  if (!isSomeBranchesDeleted) {
    console.log('All branches are actual. Nothing to delete');
  }
}


function _getSourceFiles() {
  return new Promise((resolve, reject) => {
    glob(
      config.sourceFilesPattern,
      null,
      (err, files) => err === null ? resolve(files) : reject(err)
    )
  });
}

function _getGitRemoteBranches() {
  const child = spawn('git', [ 'ls-remote', '--heads' ]);

  return child.stdout.toString().match(/refs\/heads\/.+/g).map(s => s.replace('refs/heads/', ''));
}

function _getFileLastUpdated(crowdinBranchObj) {
  return crowdinBranchObj.node_type === 'file'
    ? crowdinBranchObj.last_updated
    : _getFileLastUpdated(crowdinBranchObj.files[0]);
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

async function _isLastSourceFilesFromMasterMergedIntoCurrent() {
  spawn('git', ['fetch']);

  const sourceFiles = await sourceFilesPromise;

  return sourceFiles
    .map(sourceFile => {
      return spawn('git', ['log', '-1', '--pretty=format:"%H"' , 'origin/master', sourceFile])
        .stdout
        .toString()
        .replace(/"/g, '');
    })
    .map(lastMasterCommitId => {
      return spawn('git', ['branch', '--contains', lastMasterCommitId])
        .stdout
        .toString();
    })
    .every(branchesWithLatestCommit => {
      return branchesWithLatestCommit
        .replace(/[\* ]/g,'')
        .split('\n')
        .indexOf(gitBranchName) !== -1;
    });
}

function _isEverySourceFileSameAsInMaster(files) {
  const changedFiles = spawn('git', ['diff', 'origin/master', 'HEAD', '--stat', '--name-only'])
    .stdout
    .toString();

  return files.every(fileName => changedFiles.indexOf(fileName) !== -1);
}

function _getGitBranchName() {
  return spawn('git', [ 'rev-parse', '--abbrev-ref', 'HEAD' ])
    .stdout
    .toString()
    .split('\n')
    [0];
}


module.exports.downloadTranslations = downloadTranslations;
module.exports.uploadSources = uploadSources;
module.exports.checkProgressOnBranch = checkProgressOnBranch;
module.exports.triggerAutoTranslation = triggerAutoTranslation;
module.exports.deleteOldBranches = deleteOldBranches;
