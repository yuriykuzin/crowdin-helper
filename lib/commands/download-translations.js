const spawn = require('child_process').spawnSync;
const unzipper = require('unzipper');
const fs = require('fs');

const COLORS = require('../utilities/colors');
const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName, gitBranchName } = require('../utilities/branch-name');
const sourceFilesPromise = require('../utilities/source-files-promise');
const uploadSources = require('./upload-sources');

async function downloadTranslations(shouldIgnoreUnmergedMaster = false) {
  if (!shouldIgnoreUnmergedMaster && !(await _isLastSourceFilesFromMasterMergedIntoCurrent())) {
    console.log(
      `Crowdin: ${COLORS.RED}Please merge last master into your branch and upload sources to crowdin ` +
        `before attempting to download last translations${COLORS.WHITE}`,
    );

    process.exit(1);
  }

  console.log('Crowdin: Uploading sources before downloading');
  await uploadSources();

  console.log('Crowdin: Triggering branch build before downloading');
  await CrowdinApi.buildBranch(crowdinBranchName);

  console.log('Crowdin: Downloading branch', crowdinBranchName);

  return await CrowdinApi.getAllTranslations(crowdinBranchName).then((res) => {
    res.body
      .pipe(unzipper.Parse())
      .on('entry', (entry) => {
        if (entry.type === 'File') {
          const fileName = entry.path.replace(crowdinBranchName, '').replace(/^\//, '');

          entry.pipe(
            fs.createWriteStream(fileName).on('finish', () => {
              console.log(`Crowdin: ${COLORS.GREEN}Unzipped ${fileName} ${COLORS.WHITE}`);
            }),
          );

          return;
        }

        entry.autodrain();
      })
      .promise()
      .catch((e) => {
        console.log(
          `Crowdin: ${COLORS.RED}Unzipping failed. Probably broken ZIP file${COLORS.WHITE}`,
        );
        console.log(e);
      });
  });
}

async function _isLastSourceFilesFromMasterMergedIntoCurrent() {
  spawn('git', ['fetch']);

  const sourceFiles = await sourceFilesPromise;

  return sourceFiles
    .map((sourceFile) => {
      return spawn('git', ['log', '-1', '--pretty=format:"%H"', 'origin/master', sourceFile])
        .stdout.toString()
        .replace(/"/g, '');
    })
    .map((lastMasterCommitId) => {
      return spawn('git', ['branch', '--contains', lastMasterCommitId]).stdout.toString();
    })
    .every((branchesWithLatestCommit) => {
      return (
        branchesWithLatestCommit
          .replace(/[\* ]/g, '')
          .split('\n')
          .indexOf(gitBranchName) !== -1
      );
    });
}

module.exports = downloadTranslations;
