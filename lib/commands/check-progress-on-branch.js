const CrowdinApi = require('../utilities/crowdin-api');
const { crowdinBranchName } = require('../utilities/branch-name');
const COLORS = require('../utilities/colors');
const config = require('../utilities/config');
const triggerAutoTranslation = require('./trigger-auto-translation');


async function checkProgressOnBranch() {
  if (crowdinBranchName === 'master') {
    // Let's trigger auto-translate since it is probably a run on Semaphore or other CI tool
    await triggerAutoTranslation('master');

    console.log(`Crowdin: ${ COLORS.GREEN }No validation performed since it is a master branch${ COLORS.WHITE }`);

    return;
  }

  console.log(`Crowdin: Checking language: ${ config.languageToCheck }`);

  await CrowdinApi.getLanguageStatus()
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


module.exports = checkProgressOnBranch;
