const mockedFetch = require('jest-fetch-mock');
jest.setMock('node-fetch', mockedFetch);

jest.mock('fs');
const fs = require('fs');

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


describe('uploadSources', async () => {
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
    global.process = originalProcess;
    global.console = originalConsole;
  });


  test('should perform upload source and then download and unzip translation', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'feature/my-feature-branch');

    const uploadSources = require('../../lib/commands/upload-sources');
    expect(consoleData.indexOf('Working on git branch: feature/my-feature-branch') !== -1).toBeTruthy();
    consoleData = '';

    mockedFetch.mockResponses(
      [
        // https://api.crowdin.com/api/project/my-project-name/add-directory
        JSON.stringify({ success: true }),
        { status: 200 }
      ],
      [
        // https://api.crowdin.com/api/project/my-project-name/add-directory
        JSON.stringify({ success: true }),
        { status: 200 }
      ],
      [
        // https://api.crowdin.com/api/project/my-project-name/add-file
        JSON.stringify({ success: true }),
        { status: 200 }
      ],
      [
        // https://api.crowdin.com/api/project/my-project-name/pre-translate
        JSON.stringify({ success: true }),
        { status: 200 }
      ]
    );

    await uploadSources();

    expect(mockedFetch.mock.calls[2][1].body._streams[7].source._readableState.buffer)
      .toEqual(fs.createReadStream('test/sample-source-file/en.json')._readableState.buffer);

    expect(consoleData.indexOf('Uploading to branch: feature--my-feature-branch') !== -1).toBeTruthy();
    expect(consoleData.indexOf('test/sample-source-file/en.json is uploaded') !== -1).toBeTruthy();
    expect(consoleData.indexOf('Triggering auto-translation of a branch: feature--my-feature-branch') !== -1).toBeTruthy();

    const properApiCallsOrder = [
      'https://api.crowdin.com/api/project/my-project-name/add-directory',
      'https://api.crowdin.com/api/project/my-project-name/add-directory',
      'https://api.crowdin.com/api/project/my-project-name/add-file',
      'https://api.crowdin.com/api/project/my-project-name/pre-translate'
    ];

    properApiCallsOrder.forEach((apiCall, index) => {
      expect(mockedFetch.mock.calls[index][0]).toEqual(apiCall);
    })
  });
});
