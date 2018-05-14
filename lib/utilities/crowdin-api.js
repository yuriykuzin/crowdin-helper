const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const config = require('./config');


class CrowdinApi {
  static buildBranch(crowdinBranchName) {
    return this._crowdinFetch(`export`, { branch: crowdinBranchName });
  }

  static getAllTranslations(crowdinBranchName) {
    return this._crowdinFetch(`download/all.zip`, { branch: crowdinBranchName }, false);
  }

  static addBranch(crowdinBranchName) {
    return this._crowdinFetch('add-directory', {
      name: crowdinBranchName,
      is_branch: '1'
    })
  }

  static deleteBranch(crowdinBranchName) {
    return this._crowdinFetch('delete-directory', { name: crowdinBranchName });
  }

  static addDirectory(name, crowdinBranchName) {
    return this._crowdinFetch('add-directory', {
      name,
      branch: crowdinBranchName,
      recursive: '1'
    });
  }

  static addFile(filePath, crowdinBranchName) {
    return this._crowdinFetch('add-file', {
      ['files[' + filePath + ']']: fs.createReadStream(filePath),
      ['export_patterns[' + filePath + ']']: config.translationPattern,
      branch: crowdinBranchName
    })
  }

  static updateFile(filePath, crowdinBranchName) {
    return this._crowdinFetch('update-file', {
      ['files[' + filePath + ']']: fs.createReadStream(filePath),
      ['export_patterns[' + filePath + ']']: config.translationPattern,
      branch: crowdinBranchName
    })
  }

  static getLanguageStatus() {
    return this._crowdinFetch('language-status', { language: config.languageToCheck });
  }

  static preTranslate(sourceFilesWithBranchName) {
    return this._crowdinFetch('pre-translate', {
      'languages': config.languagesToAutoTranslate,
      'files': sourceFilesWithBranchName,
      'method': 'tm',
      'apply_untranslated_strings_only': 1,
      'perfect_match': 1
    })
  }

  static getInfo() {
    return this._crowdinFetch('info');
  }


  static async _crowdinFetch(apiMethod, rawParams = {}, isJsonResponse = true) {
    const formData = new FormData();

    formData.append('key', config.projectKey);
    formData.append('json', '');

    for (const key in rawParams) {
      if (Array.isArray(rawParams[key])) {
        rawParams[key].forEach((value) => {
          formData.append(`${ key }[]`, value);
        });
      } else {
        formData.append(key, rawParams[key]);
      }
    }

    const response = await fetch(
      `https://api.crowdin.com/api/project/${ config.projectIdentifier }/${ apiMethod }`,
      { method: 'POST', body: formData }
    );

    return isJsonResponse
      ? response.json()
      : response;
  }
}

module.exports = CrowdinApi;
