const fetch = require('jest-fetch-mock');
jest.setMock('node-fetch', fetch);
jest.mock('fs');
require('../../lib/utilities/config-manager').init();

const CrowdinApi = require('../../lib/utilities/crowdin-api');

describe('CrowdinApi', () => {
  const sampleResponse = {
    success: {
      status: 'skipped',
    },
  };

  beforeEach(() => {
    fetch.resetMocks();
    fetch.mockResponseOnce(JSON.stringify(sampleResponse));
  });

  test('CrowdinApi.buildBranch calls node-fetch, sends FormData and gets sample JSON response', async () => {
    const response = await CrowdinApi.buildBranch('sample-feature-branch-name');

    const firstFetchArgument = fetch.mock.calls[0][0];
    const secondFetchArgument = fetch.mock.calls[0][1];

    expect(firstFetchArgument).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/export',
    );
    expect(secondFetchArgument.method).toBe('POST');
    expect(secondFetchArgument.body._streams).toBeDefined();
    expect(secondFetchArgument.body._streams[1]).toBe('my-project-api-key');
    expect(response).toEqual(sampleResponse);
  });

  test('CrowdinApi.getAllTranslations gets raw (not JSON) response', async () => {
    const response = await CrowdinApi.getAllTranslations('sample-feature-branch-name');

    expect(response.status).toEqual(200);
  });

  test('crowdinFetch.preTranslate converts input array to set of pairs in FormData, calls node-fetch, gets JSON', async () => {
    const response = await CrowdinApi.preTranslate(['my-branch/sample-path/en.json']);
    const secondFetchArgumentBody = fetch.mock.calls[0][1].body;

    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/pre-translate',
    );
    expect(response).toEqual(sampleResponse);
    expect(secondFetchArgumentBody._streams[6]).toMatch('name="languages[]"');
    expect(secondFetchArgumentBody._streams[7]).toBe('nl');
    expect(secondFetchArgumentBody._streams[9]).toMatch('name="languages[]"');
    expect(secondFetchArgumentBody._streams[10]).toBe('fi');
  });

  test('CrowdinApi.addBranch calls node-fetch and gets sample JSON response', async () => {
    const response = await CrowdinApi.addBranch('sample-feature-branch-name');
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/add-directory',
    );
    expect(response).toEqual(sampleResponse);
  });

  test('CrowdinApi.deleteBranch calls node-fetch and gets sample JSON response', async () => {
    const response = await CrowdinApi.deleteBranch('sample-feature-branch-name');
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/delete-directory',
    );
    expect(response).toEqual(sampleResponse);
  });

  test('CrowdinApi.addDirectory calls node-fetch and gets sample JSON response', async () => {
    const response = await CrowdinApi.addDirectory(
      'sample-directory',
      'sample-feature-branch-name',
    );
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/add-directory',
    );
    expect(response).toEqual(sampleResponse);
  });

  test('CrowdinApi.addFile calls node-fetch and gets sample JSON response', async () => {
    const response = await CrowdinApi.addFile('sample-directory', 'sample-feature-branch-name');
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/add-file',
    );
    expect(response).toEqual(sampleResponse);
  });

  test('CrowdinApi.updateFile calls node-fetch and gets sample JSON response', async () => {
    const response = await CrowdinApi.updateFile('sample-directory', 'sample-feature-branch-name');
    expect(fetch.mock.calls[0][0]).toEqual(
      'https://api.crowdin.com/api/project/my-project-name/update-file',
    );
    expect(response).toEqual(sampleResponse);
  });

  // TODO: Fix specs
  // test('CrowdinApi.getLanguageStatus calls node-fetch and gets sample JSON response', async () => {
  //   const response = await CrowdinApi.getLanguageStatus();
  //   expect(fetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/language-status');
  //   expect(response).toEqual(sampleResponse);
  // });

  // TODO: Fix specs
  // test('CrowdinApi.getInfo calls node-fetch and gets sample JSON response', async () => {
  //   const response = await CrowdinApi.getInfo();
  //   expect(fetch.mock.calls[0][0]).toEqual(
  //     'https://api.crowdin.com/api/project/my-project-name/info',
  //   );
  //   expect(response).toEqual(sampleResponse);
  // });
});
