const fs = require('fs');

const crowdin = require('@crowdin/crowdin-api-client').default;

const configManager = require('./config-manager');
const projectId = configManager.get('projectId');

const { translationStatusApi, sourceFilesApi, translationsApi, uploadStorageApi } = new crowdin({
  token: configManager.get('token'),
});

const CROWDIN_API__UPDATE_OPTION__KEEP_TRANSLATIONS_AND_APPROVALS =
  'keep_translations_and_approvals';

const CROWDIN_API__PRE_TRANSLATION_METHOD__TRANSLATION_MEMORY = 'tm';

class CrowdinApi {
  static buildBranch(branchId) {
    return translationsApi.buildProject(projectId, { branchId });
  }

  static checkBuildStatus(buildId) {
    return translationsApi.checkBuildStatus(projectId, buildId);
  }

  static getAllTranslations(buildId) {
    return translationsApi.downloadTranslations(projectId, buildId);
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
    const data = await fs.promises.readFile(filePath, 'utf8');

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
      updateOption: CROWDIN_API__UPDATE_OPTION__KEEP_TRANSLATIONS_AND_APPROVALS,
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
      method: CROWDIN_API__PRE_TRANSLATION_METHOD__TRANSLATION_MEMORY,
      translateUntranslatedOnly: true,
      translateWithPerfectMatchOnly: true,
    });
  }
}

module.exports = CrowdinApi;
