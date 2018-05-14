const mockedFetch = require('jest-fetch-mock');
jest.setMock('node-fetch', mockedFetch);

jest.mock('fs');

jest.mock('child_process');

const originalProcess = process;
const processExitMock = jest.fn((code) => {
  throw new Error(`process exit ${ code }`);
});

let consoleData = '';
const originalConsole = global.console;
const consoleLogMock = jest.fn(value => {
  originalConsole.log(value);
  consoleData += value;
});

let mockedChildProcess;

beforeEachFn = () => {
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
  consoleData = '';
}

afterEachFn = () => {
  global.console = originalConsole;
  global.process = originalProcess;
};


describe('checkProgressOnBranch', async () => {
  beforeEach(beforeEachFn);
  afterEach(afterEachFn);

  test('should say "no new phrases" if phrases === 0', async () => {
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

  test.only('should trigger auto translate and then exit on master branch', async () => {
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

    // expect(consoleData.indexOf('Crowdin: Checking language: nl') !== -1).toBeTruthy();
    expect(consoleData.indexOf('No validation performed since it is a master branch') !== -1).toBeTruthy();
    expect(mockedFetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/pre-translate');
  });
});
