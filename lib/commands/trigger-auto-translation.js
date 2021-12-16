const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName } = require('../utilities/branch-name');
const sourceFilesPromise = require('../utilities/source-files-promise');
const COLORS = require('../utilities/colors');
const configManager = require('../utilities/config-manager');

async function triggerAutoTranslation() {
  if (configManager.get('disableAutoTranslation')) {
    console.log(`Crowdin: Auto-translation is disabled by "crowdin-helper.json"`);

    return;
  }

  console.log(`Crowdin: Triggering auto-translation of a branch: ${crowdinBranchName}`);

  const sourceFilesWithBranchName = (await sourceFilesPromise).map(
    (fileName) => `/${crowdinBranchName}/${fileName}`,
  );

  const branchData = await CrowdinApi.getBranchData(crowdinBranchName);
  const filesData = await CrowdinApi.listFiles(branchData.data.id);
  const fileIds = filesData.data
    .filter((fileData) => sourceFilesWithBranchName.includes(fileData.data.path))
    .map((fileData) => fileData.data.id);

  try {
    const translateResData = await CrowdinApi.preTranslate(fileIds);

    if (translateResData.data.status !== 'created') {
      console.log(`Crowdin: ${COLORS.RED}Error:`);
      console.log(res, COLORS.WHITE);
    }
  } catch (e) {
    console.log(
      `Crowdin: ${COLORS.RED}Error: Failed to auto-translate branch ${crowdinBranchName}${COLORS.WHITE}`,
    );
    console.log(`Original error: ${e}`);
  }
}

module.exports = triggerAutoTranslation;
