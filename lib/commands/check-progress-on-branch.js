const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName } = require('../utilities/branch-name');
const COLORS = require('../utilities/colors');
const configManager = require('../utilities/config-manager');
const triggerAutoTranslation = require('./trigger-auto-translation');

async function checkProgressOnBranch() {
  if (crowdinBranchName === 'master') {
    // Let's trigger auto-translate since it is probably a run on Semaphore or other CI tool
    await triggerAutoTranslation('master');

    console.log(
      `Crowdin: ${COLORS.GREEN}No validation performed since it is a master branch${COLORS.WHITE}`,
    );

    return;
  }

  console.log(`Crowdin: Checking language: ${configManager.get('languageToCheck')}`);

  const branchData = await CrowdinApi.getBranchData(crowdinBranchName);

  if (!branchData) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, no such branch on crowdin${COLORS.WHITE}`);

    return;
  }

  const branchProgress = await CrowdinApi.getBranchProgress(branchData.data.id);

  const currentLanguageProgress = branchProgress.data.filter(
    (dataLanguage) => dataLanguage.data.languageId === configManager.get('languageToCheck'),
  )[0];

  if (currentLanguageProgress.data.phrases.total === 0) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, no new phrases in this branch${COLORS.WHITE}`);

    return;
  }

  if (
    currentLanguageProgress.data.phrases.translated === currentLanguageProgress.data.phrases.total
  ) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, translations are ready${COLORS.WHITE}`);

    return;
  }

  console.log(
    `Crowdin: translated ${currentLanguageProgress.data.phrases.translated} / ${currentLanguageProgress.data.phrases.total}`,
  );
  console.log(`Crowdin: ${COLORS.RED}Error: There are some missing translations${COLORS.WHITE}`);

  process.exit(1);
}

module.exports = checkProgressOnBranch;
