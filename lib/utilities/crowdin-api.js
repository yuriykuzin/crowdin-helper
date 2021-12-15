const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

const crowdin = require('@crowdin/crowdin-api-client').default;

const configManager = require('./config-manager');
const projectId = configManager.get('projectId');

const { translationStatusApi, sourceFilesApi, translationsApi, uploadStorageApi } = new crowdin({
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
    return sourceFilesApi.createBranch(projectId, {
      name: crowdinBranchName,
    });
  }

  static deleteBranch(branchId) {
    return sourceFilesApi.deleteBranch(projectId, branchId);
  }

  static addDirectory(name, branchIdOrDirectoryId) {
    return sourceFilesApi.createDirectory(projectId, {
      name,
      ...branchIdOrDirectoryId,
    });
  }

  static async addStorage(filePath, fileName) {
    const data = await fs.promises.readFile(filePath);

    return uploadStorageApi.addStorage(fileName, data);
  }

  static listDirectories(branchId) {
    return sourceFilesApi.listProjectDirectories(projectId, branchId, null, null, null, null, true);
  }

  static addFile(storageId, name, directoryId) {
    return sourceFilesApi.createFile(projectId, {
      storageId,
      name,
      directoryId,
      exportOptions: { exportPattern: configManager.get('translationPattern') },
    });
  }

  static listProjectFiles(branchId, directoryId) {
    return sourceFilesApi.listProjectFiles(projectId, directoryId ? { directoryId } : { branchId });
  }

  static updateFile(storageId, fileId) {
    return sourceFilesApi.updateOrRestoreFile(projectId, fileId, {
      storageId,
      updateOption: 'keep_translations_and_approvals',
      exportOptions: { exportPattern: configManager.get('translationPattern') },
    });
  }

  static getBranches() {
    return sourceFilesApi.listProjectBranches(projectId);
  }

  static async getBranchData(crowdinBranchName) {
    return (await sourceFilesApi.listProjectBranches(projectId, crowdinBranchName)).data[0];
  }

  static getBranchProgress(branchId) {
    return translationStatusApi.getBranchProgress(projectId, branchId);
  }

  static listFiles(branchId) {
    return sourceFilesApi.listProjectFiles(projectId, {
      branchId: branchId,
      recursion: true,
    });
  }

  static preTranslate(fileIds) {
    return translationsApi.applyPreTranslation(projectId, {
      languageIds: configManager.get('languagesToAutoTranslate'),
      fileIds: fileIds,
      method: 'tm',
      translateUntranslatedOnly: true,
      translateWithPerfectMatchOnly: true,
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
