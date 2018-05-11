const fetch = require('jest-fetch-mock');
jest.setMock('node-fetch', fetch);
jest.mock('fs');
jest.mock('child_process');


const originalProcess = process;
const processExitMock = jest.fn();

let consoleData = '';
const originalConsole = global.console;
const consoleLogMock = jest.fn(value => {
  originalConsole.log(value);
  consoleData += value;
});

beforeEachFn = () => {
  jest.resetModules();
  fetch.resetMocks();

  global.console = {
    ...global.console,
    log: consoleLogMock
  }

  global.process = {
    ...global.process,
    exit: processExitMock
  };
}

afterEachFn = () => {
  global.process = originalProcess;
  global.console = originalConsole;
};

// const {
//   downloadTranslations,
//   uploadSources,
//   checkProgressOnBranch,
//   triggerAutoTranslation,
//   deleteOldBranches
// } = require('../lib/crowdin-methods');

describe('downloadTranslations', async () => {
  beforeEach(beforeEachFn);
  afterEach(afterEachFn);


  test('', async () => {
    const mockedChildProcess = require('child_process');
    mockedChildProcess.__setResponse('git rev-parse --abbrev-ref HEAD', 'master');

    const { downloadTranslations } = require('../lib/crowdin-methods');

    expect(consoleData.indexOf('Working on git branch: master') !== -1).toBeTruthy();
    consoleData = '';

    const glob = require('glob');

    jest.mock('glob', () => (a, b, cb) => {
      console.log('eeee', cb);
      // cb(null, ['./test/sample-source-file/en.json']);
    });

    // jest.mock('glob');

    glob.mockImplementation(() => {
      console.log('mocked!!!');
      return Promise.resolve(['eeee']);
    });

    await downloadTranslations(true);





    // fetch.mockResponse(JSON.stringify(sampleResponse));

    // const response = await crowdinFetch('export');

    // expect(fetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/export');
    // expect(fetch.mock.calls[0][1].method).toBe('POST');
    // expect(fetch.mock.calls[0][1].body._streams).toBeDefined();
    // expect(fetch.mock.calls[0][1].body._streams[1]).toBe('my-project-api-key');
    // expect(response).toEqual(sampleResponse);
  });

  // test('crowdinFetch gets raw (not JSON) response', async () => {
  //   fetch.mockResponse(JSON.stringify(sampleResponse));
  //   const response = await crowdinFetch('export', {}, false);

  //   expect(response.status).toEqual(200);
  // });
});
