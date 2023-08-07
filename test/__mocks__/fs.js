const { Readable } = require('stream');
const fs = jest.genMockFromModule('fs');

const MOCK_CONFIG_FILE_CONTENT_DEFAULT = `
  {
    "projectId": "my-project-id",
    "token": "my-personal-access-token",
    "source": "/**/en.json",
    "translation": "/sample-translation-folder/%two_letters_code%.json",
    "languagesToCheck": ["nl", "de"],
    "languagesToAutoTranslate": ["nl", "fi"],
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

  if (fileName === '/path/to/crowdin-helper.json' && encoding === 'utf8') {
    return mockConfigFileContent.replace('my-project-id', 'my-another-project-id');
  }

  return null;
}

function createReadStream(filePath) {
  const readable = new Readable();

  if (filePath === 'test/sample-source-file/en.json') {
    readable.push(JSON.stringify({ TRANSLATION_KEY: 'Source in English' }));
    readable.push(null);
  }

  return readable;
}

function createWriteStream(filePath) {
  return {
    on: (name, cb) => cb(),
    write: () => null,
  };
}

fs.readFileSync = readFileSync;
fs.createReadStream = createReadStream;
fs.createWriteStream = createWriteStream;
fs.__setMockConfigFileContent = __setMockConfigFileContent;
fs.__resetMockConfigFileContent = __resetMockConfigFileContent;

module.exports = fs;
