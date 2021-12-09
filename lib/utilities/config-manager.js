const fs = require('fs');

const COLORS = require('./colors');

const configManager = {
  _config: {},

  init(pathToFile) {
    let crowdinHelperJson;

    try {
      crowdinHelperJson = JSON.parse(fs.readFileSync(pathToFile || 'crowdin-helper.json', 'utf8'));

      const requiredConfigProperties = ['projectIdentifier', 'projectKey', 'source', 'translation'];

      let isSomeRequiredFieldsAbsent = false;

      requiredConfigProperties.forEach((property) => {
        if (!crowdinHelperJson[property]) {
          console.log(
            `Crowdin: ${COLORS.RED}Error: ${property} is missing in crowdin-helper.json${COLORS.WHITE}`,
          );
          isSomeRequiredFieldsAbsent = true;
        }
      });

      if (isSomeRequiredFieldsAbsent) {
        throw new Error();
      }
    } catch (err) {
      console.log(
        `Crowdin: ${COLORS.RED}Error: crowdin-helper.json is invalid or missing${COLORS.WHITE}`,
      );
      console.log('Crowdin: Please fix it according to documentation');

      process.exit(1);
    }

    this._config = {
      projectIdentifier: crowdinHelperJson.projectIdentifier, // api v1
      projectKey: crowdinHelperJson.projectKey, // api v1
      projectId: crowdinHelperJson.projectId, // api v2
      token: crowdinHelperJson.token, // api v2
      sourceFilesPattern: crowdinHelperJson.source.replace(/^\//, ''),
      translationPattern: crowdinHelperJson.translation,
      languageToCheck: crowdinHelperJson.languageToCheck || '',
      languagesToAutoTranslate: crowdinHelperJson.languagesToAutoTranslate || [],
      daysSinceLastUpdatedToDeleteBranchSafely:
        crowdinHelperJson.daysSinceLastUpdatedToDeleteBranchSafely || 3,
      minutesSinceLastMasterMergeToPurgeSafely:
        crowdinHelperJson.minutesSinceLastMasterMergeToPurgeSafely || 20,
      disableAutoTranslation: crowdinHelperJson.disableAutoTranslation === true,
    };
  },

  get(propName) {
    return this._config[propName];
  },
};

module.exports = configManager;
