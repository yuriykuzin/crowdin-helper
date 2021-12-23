const spawn = require('child_process').spawnSync;
const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName } = require('../utilities/branch-name');
const sourceFilesPromise = require('../utilities/source-files-promise');
const COLORS = require('../utilities/colors');
const triggerAutoTranslation = require('./trigger-auto-translation');

async function uploadSources(shouldExitIfSourceFileWasNotChanged = false) {
  const files = await sourceFilesPromise;

  if (shouldExitIfSourceFileWasNotChanged && _isEverySourceFileSameAsInMaster(files)) {
    console.log(`Crowdin: Source files are unchanged. Nothing to upload`);

    return;
  }

  console.log(`Crowdin: Uploading to branch: ${crowdinBranchName}`);

  const branchData = await CrowdinApi.getBranchData(crowdinBranchName);

  const branchId = branchData
    ? branchData.data.id
    : (await CrowdinApi.addBranch(crowdinBranchName)).data.id;

  // we have to process requests to crowdin sequentially
  await files.reduce(async (sequentialPromise, filePath) => {
    await sequentialPromise;
    const findDirName = filePath.match(/(.+?)\/[^\/]+$/);

    let lastDirId;

    // Create directories if necessary
    if (findDirName) {
      const dirsToCreate = findDirName[1].split('/');
      const existingDirs = (await CrowdinApi.listDirectories(branchId)).data;

      await dirsToCreate.reduce(async (prevDirIdPromise, dir) => {
        const prevDirId = prevDirIdPromise && (await prevDirIdPromise);

        const dirIfExists = existingDirs.find(
          (existingDir) =>
            existingDir.data.name === dir && existingDir.data.directoryId === prevDirId,
        );

        lastDirId = dirIfExists
          ? dirIfExists.data.id
          : (
              await CrowdinApi.addDirectory(
                dir,
                prevDirId ? { directoryId: prevDirId } : { branchId },
              )
            ).data.id;

        return lastDirId;
      }, null);
    }

    const fileName = filePath.split('/').slice(-1)[0];
    const storageId = (await CrowdinApi.addStorage(filePath, fileName)).data.id;

    const existingFile = (await CrowdinApi.listProjectFiles(branchId, lastDirId)).data.find(
      (file) => file.data.path === `/${crowdinBranchName}/${filePath}`,
    );

    await (existingFile
      ? CrowdinApi.updateFile(storageId, existingFile.data.id)
      : CrowdinApi.addFile(storageId, fileName, lastDirId));

    console.log(`Crowdin:${COLORS.GREEN} ${filePath} is uploaded ${COLORS.WHITE}`);
  }, Promise.resolve());

  await triggerAutoTranslation();
}

function _isEverySourceFileSameAsInMaster(files) {
  const changedFiles = spawn('git', [
    'diff',
    'origin/master',
    'HEAD',
    '--stat',
    '--name-only',
  ]).stdout.toString();

  return files.every((fileName) => !changedFiles.includes(fileName));
}

module.exports = uploadSources;
