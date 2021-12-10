const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const crowdin = require('@crowdin/crowdin-api-client').default;

const configManager = require('./config-manager');

const { translationStatusApi, sourceFilesApi } = new crowdin({
  token: configManager.get('token'),
});

class CrowdinApi {
  static buildBranch(crowdinBranchName) {
    return _crowdinFetch(`export`, { branch: crowdinBranchName });
  }

  static getAllTranslations(crowdinBranchName) {
    return _crowdinFetch(`download/all.zip`, { branch: crowdinBranchName }, false);
  }

  static addBranch(crowdinBranchName) {
    return _crowdinFetch('add-directory', {
      name: crowdinBranchName,
      is_branch: '1',
    });
  }

  static deleteBranch(branchId) {
    return sourceFilesApi.deleteBranch(configManager.get('projectId'), branchId);
  }

  static addDirectory(name, crowdinBranchName) {
    return _crowdinFetch('add-directory', {
      name,
      branch: crowdinBranchName,
      recursive: '1',
    });
  }

  static addFile(filePath, crowdinBranchName) {
    return _crowdinFetch('add-file', {
      ['files[' + filePath + ']']: fs.createReadStream(filePath),
      ['export_patterns[' + filePath + ']']: configManager.get('translationPattern'),
      branch: crowdinBranchName,
    });
  }

  static updateFile(filePath, crowdinBranchName) {
    return _crowdinFetch('update-file', {
      ['files[' + filePath + ']']: fs.createReadStream(filePath),
      ['export_patterns[' + filePath + ']']: configManager.get('translationPattern'),
      branch: crowdinBranchName,
    });
  }

  static getBranches() {
    return sourceFilesApi.listProjectBranches(configManager.get('projectId'));
  }

  static async getBranchData(crowdinBranchName) {
    return (
      await sourceFilesApi.listProjectBranches(configManager.get('projectId'), crowdinBranchName)
    ).data[0];
  }

  static getBranchProgress(branchId) {
    return translationStatusApi.getBranchProgress(configManager.get('projectId'), branchId);
  }

  static preTranslate(sourceFilesWithBranchName) {
    return _crowdinFetch('pre-translate', {
      languages: configManager.get('languagesToAutoTranslate'),
      files: sourceFilesWithBranchName,
      method: 'tm',
      apply_untranslated_strings_only: 1,
      perfect_match: 1,
    });
  }
}

async function _crowdinFetch(apiMethod, rawParams = {}, isJsonResponse = true) {
  const formData = new FormData();

  formData.append('key', configManager.get('projectKey'));
  formData.append('json', '');

  for (const key in rawParams) {
    if (Array.isArray(rawParams[key])) {
      rawParams[key].forEach((value) => {
        formData.append(`${key}[]`, value);
      });
    } else {
      formData.append(key, rawParams[key]);
    }
  }

  const response = await fetch(
    `https://api.crowdin.com/api/project/${configManager.get('projectIdentifier')}/${apiMethod}`,
    { method: 'POST', body: formData },
  );

  return isJsonResponse ? response.json() : response;
}

module.exports = CrowdinApi;
