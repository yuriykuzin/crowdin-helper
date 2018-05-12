jest.mock('fs');

describe('config', () => {
  const originalProcess = process;
  const processExitMock = jest.fn((code) => {
    throw new Error(`process exit ${ code }`);
  });

  let consoleData = '';
  const originalConsole = global.console;
  const consoleLogMock = jest.fn(value => (consoleData += value));

  beforeEach(() => {
    jest.resetModules();

    global.console = {
      ...global.console,
      log: consoleLogMock
    }

    global.process = {
      ...global.process,
      exit: processExitMock
    };
  });

  afterEach(() => {
    global.process = originalProcess;
    global.console = originalConsole;
  });

  test('read config file and fill all fields', () => {
    const config = require('../lib/config');

    expect(config).toEqual({
      "projectIdentifier": "my-project-name",
      "projectKey": "my-project-api-key",
      "sourceFilesPattern": "**/en.json",
      "translationPattern": "/sample-translation-folder/%two_letters_code%.json",
      "languageToCheck": "nl",
      "languagesToAutoTranslate": ["nl", "fi"],
      "daysSinceLastUpdatedToDeleteBranchSafely": 3,
      "minutesSinceLastMasterMergeToPurgeSafely": 20,
      "disableAutoTranslation": false
    });
  });

  test('should exit if not get a valid JSON', () => {
    require('fs').__setMockConfigFileContent(null);
    let config;

    try {
      config = require('../lib/config');
    } catch(e) {}

    expect(config).toBeUndefined();
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  test('should report of all missing required props', () => {
    const requiredProps = [
      'projectIdentifier',
      'projectKey',
      'source',
      'translation'
    ];

    require('fs').__setMockConfigFileContent(JSON.stringify({}));
    let config;

    try {
      config = require('../lib/config');
    } catch(e) {}

    expect(config).toBeUndefined();
    requiredProps.forEach(requiredProp => {
      expect(consoleData).toContain(`Error: ${ requiredProp } is missing in crowdin-helper.json`)
    });
  });
});
