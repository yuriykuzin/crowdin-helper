const fs = require('fs');


if (!fs.existsSync('crowdin-helper.json')) {
  console.log(`Crowdin: ${_COLOR_RED}Error: crowdin-helper.json is missing${_COLOR_WHITE}`);
  console.log('Crowdin: Please refer documentation');

  process.exit(1);
}

let crowdinHelperJson;

try {
  crowdinHelperJson = JSON.parse(fs.readFileSync('crowdin-helper.json', 'utf8'));
} catch (err) {
  console.log(`Crowdin: ${_COLOR_RED}Error: crowdin-helper.json is invalid${_COLOR_WHITE}`);
  console.log('Crowdin: Please fix or remove it');

  process.exit(1);
}

const config = {
  projectIdentifier: crowdinHelperJson.projectIdentifier,
  projectKey: crowdinHelperJson.projectKey,
  sourceFilesPattern: crowdinHelperJson.source.replace(/^\//, ''),
  translationPattern: crowdinHelperJson.translation,
  languageToCheck: crowdinHelperJson.languageToCheck || 'nl',
  languagesToAutoTranslate: crowdinHelperJson.languagesToAutoTranslate || ['nl'],
  daysSinceLastUpdatedToDeleteBranchSafely: crowdinHelperJson.daysSinceLastUpdatedToDeleteBranchSafely || 3,
  minutesSinceLastMasterMergeToPurgeSafely: crowdinHelperJson.minutesSinceLastMasterMergeToPurgeSafely || 20,
  disableAutoTranslation: crowdinHelperJson.disableAutoTranslation === true,
};


module.exports = config;
