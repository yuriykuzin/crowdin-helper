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


describe('downloadTranslations', async () => {
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
    global.process = originalProcess;
    global.console = originalConsole;
  });


  test('should exit if last source from master is not merged into current branch', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'feature/my-feature-branch');
    mockedChildProcess.__setResponse('git fetch', '');
    mockedChildProcess.__setResponse(
      'git log -1 --pretty=format:"%H" origin/master test/sample-source-file/en.json',
      'b123b123b0a1b123bb1bb1111b1b12345b12b12b'
    );
    mockedChildProcess.__setResponse(
      'git branch --contains b123b123b0a1b123bb1bb1111b1b12345b12b12b',
      `  master
       * another-feature/my-another-feature-branch`
    );

    const downloadTranslations = require('../../lib/commands/download-translations');
    expect(consoleData.indexOf('Working on git branch: feature/my-feature-branch') !== -1).toBeTruthy();

    try {
      await downloadTranslations();
    } catch(e) {}

    expect(processExitMock).toHaveBeenCalledWith(1);
  });

  test('should perform upload source and then download and unzip translation', async () => {
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'feature/my-feature-branch');

    const downloadTranslations = require('../../lib/commands/download-translations');
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
      ],
      [
        // https://api.crowdin.com/api/project/my-project-name/export
        JSON.stringify({ success: true }),
        { status: 200 }
      ],
      [
        // https://api.crowdin.com/api/project/my-project-name/download/all.zip
        {
          pipe: () => ({
            on: (name, callback) => {
              callback({
                type: 'File',
                path: 'feature--my-feature-branch/sample-translation-folder/nl.json',
                pipe: () => null,
                autodrain: () => null
              });

              return {
                promise: () => Promise.resolve()
              };
            }
          })
        },
        { status: 200 }
      ],
    );

    await downloadTranslations(true);

    expect(mockedFetch.mock.calls[2][1].body._streams[7].source._readableState.buffer)
      .toEqual(fs.createReadStream('test/sample-source-file/en.json')._readableState.buffer);

    expect(consoleData.indexOf('Uploading to branch: feature--my-feature-branch') !== -1).toBeTruthy();
    expect(consoleData.indexOf('Triggering auto-translation of a branch: feature--my-feature-branch') !== -1).toBeTruthy();
    expect(consoleData.indexOf('Triggering branch build before downloading') !== -1).toBeTruthy();
    expect(consoleData.indexOf('Unzipped sample-translation-folder/nl.json') !== -1).toBeTruthy();

    const properApiCallsOrder = [
      'https://api.crowdin.com/api/project/my-project-name/add-directory',
      'https://api.crowdin.com/api/project/my-project-name/add-directory',
      'https://api.crowdin.com/api/project/my-project-name/add-file',
      'https://api.crowdin.com/api/project/my-project-name/pre-translate',
      'https://api.crowdin.com/api/project/my-project-name/export',
      'https://api.crowdin.com/api/project/my-project-name/download/all.zip'
    ];

    properApiCallsOrder.forEach((apiCall, index) => {
      expect(mockedFetch.mock.calls[index][0]).toEqual(apiCall);
    })
  });
});
