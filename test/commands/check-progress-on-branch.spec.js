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


describe('checkProgressOnBranch', async () => {
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
    require('../../lib/utilities/config-manager').init();

    const checkProgressOnBranch = require('../../lib/commands/check-progress-on-branch');
    expect(consoleData.indexOf('Working on git branch: feature/my-feature-branch') !== -1).toBeTruthy();
    consoleData = '';

    mockedFetch.mockResponses(
      [
        // https://api.crowdin.com/api/project/my-project-name/language-status
        JSON.stringify({
          files: [{
            node_type: 'branch',
            name: 'feature--my-feature-branch',
            phrases: 0
          }]
        }),
        { status: 200 }
      ]
    );

    await checkProgressOnBranch();

    expect(consoleData.indexOf('Crowdin: Checking language: nl') !== -1).toBeTruthy();
    expect(consoleData.indexOf('Okay, no new phrases in this branch') !== -1).toBeTruthy();
    expect(mockedFetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/language-status');
  });

  test('should trigger auto translate and then exit on master branch', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'master');

    const checkProgressOnBranch = require('../../lib/commands/check-progress-on-branch');
    expect(consoleData.indexOf('Working on git branch: master') !== -1).toBeTruthy();
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

    await checkProgressOnBranch();

    expect(consoleData.indexOf('No validation performed since it is a master branch') !== -1).toBeTruthy();
    expect(mockedFetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/pre-translate');
  });

  test('should output amount of translated/total strings if not all are translated', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'feature/my-feature-branch');

    const checkProgressOnBranch = require('../../lib/commands/check-progress-on-branch');
    expect(consoleData.indexOf('Working on git branch: feature/my-feature-branch') !== -1).toBeTruthy();
    consoleData = '';

    mockedFetch.mockResponses(
      [
        // https://api.crowdin.com/api/project/my-project-name/language-status
        JSON.stringify({
          files: [{
            node_type: 'branch',
            name: 'feature--my-feature-branch',
            phrases: 5,
            translated: 4
          }]
        }),
        { status: 200 }
      ]
    );

    try {
      await checkProgressOnBranch();
    } catch(e) {}

    expect(processExitMock).toHaveBeenCalledWith(1);
    expect(consoleData.indexOf('Crowdin: translated 4 / 5') !== -1).toBeTruthy();
    expect(consoleData.indexOf('Error: There are some missing translations') !== -1).toBeTruthy();
    expect(mockedFetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/language-status');
  });
});
