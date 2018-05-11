const fs = jest.genMockFromModule('fs');

const MOCK_CONFIG_FILE_CONTENT_DEFAULT = `
  {
    "projectIdentifier": "my-project-name",
    "projectKey": "my-project-api-key",
    "source": "/**/en.json",
    "translation": "/sample-translation-folder/%two_letters_code%.json",
    "languageToCheck": "nl",
    "languagesToAutoTranslate": ["nl", "fi"],
    "daysSinceLastUpdatedToDeleteBranchSafely": 3,
    "minutesSinceLastMasterMergeToPurgeSafely": 20,
    "disableAutoTranslation": false
  }
`;

let mockConfigFileContent = MOCK_CONFIG_FILE_CONTENT_DEFAULT;

function __resetMockConfigFileContent() {
  mockConfigFileContent = MOCK_CONFIG_FILE_CONTENT_DEFAULT;
}

function __setMockConfigFileContent(fileContent) {
  mockConfigFileContent = fileContent;
}

function readFileSync(fileName, encoding) {
  if (fileName === 'crowdin-helper.json' && encoding === 'utf8') {
    return mockConfigFileContent;
  }

  return null;
}

fs.readFileSync = readFileSync;
fs.__setMockConfigFileContent = __setMockConfigFileContent;
fs.__resetMockConfigFileContent = __resetMockConfigFileContent;

module.exports = fs;
