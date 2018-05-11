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
  });

  test('crowdinFetch calls node-fetch, sends FormData and gets sample JSON response', async () => {
    fetch.mockResponse(JSON.stringify(sampleResponse));

    const response = await crowdinFetch('export');

    expect(fetch.mock.calls[0][0]).toEqual('https://api.crowdin.com/api/project/my-project-name/export');
    expect(fetch.mock.calls[0][1].method).toBe('POST');
    expect(fetch.mock.calls[0][1].body._streams).toBeDefined();
    expect(fetch.mock.calls[0][1].body._streams[1]).toBe('my-project-api-key');
    expect(response).toEqual(sampleResponse);
  });

  test('crowdinFetch gets raw (not JSON) response', async () => {
    fetch.mockResponse(JSON.stringify(sampleResponse));
    const response = await crowdinFetch('export', {}, false);

    expect(response.status).toEqual(200);
  });

  test('crowdinFetch converts input array to set of pairs in FormData', async () => {
    const response = await crowdinFetch('pre-translate', { languages: ['nl', 'en'] }, false);

    expect(fetch.mock.calls[0][1].body._streams[6]).toMatch('name="languages[]"');
    expect(fetch.mock.calls[0][1].body._streams[7]).toBe('nl');
    expect(fetch.mock.calls[0][1].body._streams[9]).toMatch('name="languages[]"');
    expect(fetch.mock.calls[0][1].body._streams[10]).toBe('en');
  });
});
