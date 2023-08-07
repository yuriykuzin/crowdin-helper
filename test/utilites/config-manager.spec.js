jest.mock('fs');

describe('config-manager', () => {
  const originalProcess = process;
  const processExitMock = jest.fn((code) => {
    throw new Error(`process exit ${code}`);
  });

  let consoleData = '';
  const originalConsole = global.console;
  const consoleLogMock = jest.fn((value) => (consoleData += value));

  beforeEach(() => {
    jest.resetModules();

    global.console = {
      ...global.console,
      log: consoleLogMock,
    };

    global.process = {
      ...global.process,
      exit: processExitMock,
    };
  });

  afterEach(() => {
    global.process = originalProcess;
    global.console = originalConsole;
  });

  test('read config file and fill all fields', () => {
    const configManager = require('../../lib/utilities/config-manager');
    configManager.init();

    expect(configManager.get('projectId')).toBe('my-project-id');
    expect(configManager.get('token')).toBe('my-personal-access-token');
    expect(configManager.get('sourceFilesPattern')).toBe('**/en.json');
    expect(configManager.get('translationPattern')).toBe(
      '/sample-translation-folder/%two_letters_code%.json',
    );
    expect(configManager.get('languagesToCheck')).toStrictEqual(['nl', 'de']);
    expect(configManager.get('languagesToAutoTranslate')).toEqual(['nl', 'fi']);
    expect(configManager.get('minutesSinceLastMasterMergeToPurgeSafely')).toBe(20);
    expect(configManager.get('disableAutoTranslation')).toBeFalsy();
  });

  test('read config file from the path', () => {
    const configManager = require('../../lib/utilities/config-manager');
    configManager.init('/path/to/crowdin-helper.json');

    expect(configManager.get('projectId')).toBe('my-another-project-id');
  });

  test('should exit if not get a valid JSON', () => {
    require('fs').__setMockConfigFileContent(null);
    let configManager;

    try {
      configManager = require('../../lib/utilities/config-manager');
      configManager.init();
    } catch (e) {}

    expect(configManager.get('projectId')).toBeUndefined();
    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  test('should report of all missing required props', () => {
    const requiredProps = ['token', 'projectId', 'source', 'translation'];

    require('fs').__setMockConfigFileContent(JSON.stringify({}));

    try {
      require('../../lib/utilities/config-manager').init();
    } catch (e) {}

    requiredProps.forEach((requiredProp) => {
      expect(consoleData).toContain(`Error: ${requiredProp} is missing in crowdin-helper.json`);
    });
  });
});
