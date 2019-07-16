const mockedFetch = require('jest-fetch-mock');
jest.setMock('node-fetch', mockedFetch);

jest.mock('fs');

jest.mock('child_process');

jest.mock('glob', () => {
  return jest.fn((pattern, options, callback) => {
    callback(null, ['test/sample-source-file/en.json']);
  });
});

const originalProcess = process;
const processExitMock = jest.fn((code) => {
  throw new Error(`process exit ${ code }`);
});

let consoleData = '';
const originalConsole = global.console;
const consoleLogMock = jest.fn(value => {
  // originalConsole.log(value);
  consoleData += value;
});


describe('triggerAutoTranslation', async () => {
  let mockedChildProcess;

  beforeEach(() => {
    jest.resetModules();
    mockedFetch.resetMocks();

    global.console = {
      ...global.console,
      log: consoleLogMock
    }

    global.process = {
      ...global.process,
      exit: processExitMock
    };

    mockedChildProcess = require('child_process');
    require('../../lib/utilities/config-manager').init();
    consoleData = '';
  });

  afterEach(() => {
    global.console = originalConsole;
    global.process = originalProcess;
  });


  test('should say "no new phrases" if phrases === 0', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'feature/my-feature-branch');

    const triggerAutoTranslation = require('../../lib/commands/trigger-auto-translation');
    expect(consoleData.indexOf('Working on git branch: feature/my-feature-branch') !== -1).toBeTruthy();
    consoleData = '';

    mockedFetch.mockResponses(
      [
        // https://api.crowdin.com/api/project/pre-translate
        JSON.stringify({
          success: true
        }),
        { status: 200 }
      ]
    );

    await triggerAutoTranslation();

    expect(mockedFetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/pre-translate');
  });
});
