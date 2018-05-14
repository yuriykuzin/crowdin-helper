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


describe('deleteOldBranches', async () => {
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
    consoleData = '';
  });

  afterEach(() => {
    global.console = originalConsole;
    global.process = originalProcess;
  });


  test('', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'feature/my-feature-branch');

    const deleteOldBranches = require('../../lib/commands/delete-old-branches');

    mockedChildProcess.__setResponse('git fetch', ' ');
    mockedChildProcess.__setResponse('git log -1 --format=%cd origin/master', 'Fri May 4 10:40:15 2018 +0300');
    mockedChildProcess.__setResponse('git ls-remote --heads', 'refs/heads/master');

    mockedFetch.mockResponses(
      [
        // https://api.crowdin.com/api/project/info
        JSON.stringify({
          files: [
            {
              node_type: 'branch',
              name: 'sample-old-branch',
              files: [{
                node_type: 'file',
                name: 'sample-file-name.json',
                last_updated: 'Fri May 4 10:40:15 2018 +0300'
              }]
            }
          ]
        }),
        { status: 200 }
      ],
      [
        // https://api.crowdin.com/api/project/delete-directory
        JSON.stringify({
          success: true
        }),
        { status: 200 }
      ]
    );

    await deleteOldBranches();

    expect(consoleData.indexOf('Branch "sample-old-branch" is removed from crowdin') !== -1).toBeTruthy();
    expect(mockedFetch.mock.calls[1][0])
      .toEqual('https://api.crowdin.com/api/project/my-project-name/delete-directory');
  });
});
