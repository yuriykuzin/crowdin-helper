const fetch = require('jest-fetch-mock');
jest.setMock('node-fetch', fetch);
jest.mock('fs');

const crowdinFetch = require('../lib/crowdin-fetch');

describe('crowdin-fetch', () => {
  const sampleResponse = {
    "success": {
        "status": "skipped"
    }
  };

  beforeEach(() => {
    fetch.resetMocks();
    fetch.mockResponseOnce(JSON.stringify(sampleResponse));
  });


  test('crowdinFetch calls node-fetch, sends FormData and gets sample JSON response', async () => {
    const response = await crowdinFetch('export');
    const firstFetchArgument = fetch.mock.calls[0][0];
    const secondFetchArgument = fetch.mock.calls[0][1];

    expect(firstFetchArgument).toEqual('https://api.crowdin.com/api/project/my-project-name/export');
    expect(secondFetchArgument.method).toBe('POST');
    expect(secondFetchArgument.body._streams).toBeDefined();
    expect(secondFetchArgument.body._streams[1]).toBe('my-project-api-key');
    expect(response).toEqual(sampleResponse);
  });

  test('crowdinFetch gets raw (not JSON) response', async () => {
    const response = await crowdinFetch('export', {}, false);

    expect(response.status).toEqual(200);
  });

  test('crowdinFetch converts input array to set of pairs in FormData', async () => {
    const response = await crowdinFetch('pre-translate', { languages: ['nl', 'en'] }, false);
    const secondFetchArgumentBody = fetch.mock.calls[0][1].body;

    expect(secondFetchArgumentBody._streams[6]).toMatch('name="languages[]"');
    expect(secondFetchArgumentBody._streams[7]).toBe('nl');
    expect(secondFetchArgumentBody._streams[9]).toMatch('name="languages[]"');
    expect(secondFetchArgumentBody._streams[10]).toBe('en');
  });
});
