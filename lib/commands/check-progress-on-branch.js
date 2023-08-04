const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName } = require('../utilities/branch-name');
const COLORS = require('../utilities/colors');
const configManager = require('../utilities/config-manager');
const triggerAutoTranslation = require('./trigger-auto-translation');

const MASTER_BRANCH_NAME = configManager.get('masterBranchName');

async function checkProgressOnBranch() {
  if (crowdinBranchName === MASTER_BRANCH_NAME) {
    // Let's trigger auto-translate since it is probably a run on Semaphore or other CI tool
    await triggerAutoTranslation(MASTER_BRANCH_NAME);

    console.log(
      `Crowdin: ${COLORS.GREEN}No validation performed since it is a master branch${COLORS.RESET}`,
    );

    return;
  }

  const requiredLanguageList = configManager.get('languagesToCheck');

  console.log(`Crowdin: Checking language(s): ${COLORS.CYAN}${requiredLanguageList.join(`${COLORS.RESET}, ${COLORS.CYAN}`)}${COLORS.RESET}`);

  const branchData = await CrowdinApi.getBranchData(crowdinBranchName);

  if (!branchData) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, no such branch on crowdin${COLORS.RESET}`);

    return;
  }

  if (requiredLanguageList.length === 0) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, no required languages to translate${COLORS.RESET}`);

    return;
  }

  const branchProgress = await CrowdinApi.getBranchProgress(branchData.data.id);

  const requiredLanguageProgressList = branchProgress.data.filter(
    (dataLanguage) => requiredLanguageList.includes(dataLanguage.data.languageId),
  );

  const hasLanguageWithNewPhrases = requiredLanguageProgressList.some(dataLanguage => dataLanguage.data.phrases.total > 0);
  if (!hasLanguageWithNewPhrases) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, no new phrases in this branch${COLORS.RESET}`);

    return;
  }

  const isRequiredLanguagesTranslated = requiredLanguageProgressList.every(dataLanguage => dataLanguage.data.phrases.translated === dataLanguage.data.phrases.total);
  if (isRequiredLanguagesTranslated) {
    console.log(`Crowdin: ${COLORS.GREEN}Okay, translations are ready${COLORS.RESET}`);

    return;
  }

  requiredLanguageProgressList.forEach(dataLanguage => {
    const translationStatusColor = dataLanguage.data.phrases.translated === dataLanguage.data.phrases.total ? COLORS.GREEN : COLORS.RED;

    console.log(
      `Crowdin: translated ${COLORS.CYAN}${dataLanguage.data.languageId}${COLORS.RESET}: ${translationStatusColor}${dataLanguage.data.phrases.translated} / ${dataLanguage.data.phrases.total}${COLORS.RESET}`,
    );
  });

  console.log(`Crowdin: ${COLORS.RED}Error: There are some missing translations${COLORS.RESET}`);

  process.exit(1);
}

module.exports = checkProgressOnBranch;
