const spawn = require('child_process').spawnSync;
const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName } = require('../utilities/branch-name');
const sourceFilesPromise = require('../utilities/source-files-promise');
const COLORS = require('../utilities/colors');
const triggerAutoTranslation = require('./trigger-auto-translation');


async function uploadSources(shouldExitIfSourceFileWasNotChanged = false) {
  const files = await sourceFilesPromise;

  if (shouldExitIfSourceFileWasNotChanged && _isEverySourceFileSameAsInMaster(files)) {
    console.log(`Crowdin: Source files are unchenged. Nothing to upload`);

    return;
  }

  console.log(`Crowdin: Uploading to branch: ${ crowdinBranchName }`);

  const isBranchNewlyCreated = await CrowdinApi.addBranch(crowdinBranchName)
    .then(json => json.success);

  await Promise.all(
    files.map(async filePath => {
      const findDirName = filePath.match(/(.+?)\/[^\/]+$/);

      if (findDirName) {
        await CrowdinApi.addDirectory(findDirName[1], crowdinBranchName)
      }

      // We assume, that file is already there is branch was already existed
      // If, not and therefore 'update-file' failes, we'll perform 'add-file' then
      const response = await (
        (isBranchNewlyCreated)
          ? CrowdinApi.addFile(filePath, crowdinBranchName)
          : CrowdinApi.updateFile(filePath, crowdinBranchName)
      )
        .then(json => {
          if (json.error && json.error.code === 8) {
            // File was not found

            return CrowdinApi.addFile(filePath, crowdinBranchName);
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


function _isEverySourceFileSameAsInMaster(files) {
  const changedFiles = spawn('git', ['diff', 'origin/master', 'HEAD', '--stat', '--name-only'])
    .stdout
    .toString();

  return files.every(fileName => changedFiles.indexOf(fileName) !== -1);
}


module.exports = uploadSources;
