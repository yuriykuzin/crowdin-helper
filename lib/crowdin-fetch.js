const fetch = require('node-fetch');
const FormData = require('form-data');

const config = require('./config');


async function crowdinFetch(apiMethod, rawParams = {}, isJsonResponse = true) {
  const formData = new FormData();

  formData.append('key', config.projectKey);
  formData.append('json', '');

  for (const key in rawParams) {
    if (Array.isArray(rawParams[key])) {
      rawParams[key].forEach((value) => {
        formData.append(`${ key }[]`, value);
      });
    } else {
      formData.append(key, rawParams[key]);
    }
  }

  const response = await fetch(
    `https://api.crowdin.com/api/project/${ config.projectIdentifier }/${ apiMethod }`,
    { method: 'POST', body: formData }
  );

  return isJsonResponse
    ? response.json()
    : response;
}

module.exports = crowdinFetch;
