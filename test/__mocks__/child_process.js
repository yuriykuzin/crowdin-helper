const child_process = jest.genMockFromModule('child_process');

const responses = [];

function spawnSync(command, args = []) {
  const joinedCommand = [command, ...args].join(' ');

  return {
    stdout: {
      toString: () => {
        return responses[joinedCommand] || '';
      }
    }
  };
}

function __setResponse(joinedCommand, responseValue) {
  responses[joinedCommand] = responseValue;
}

child_process.spawnSync = spawnSync;
child_process.__setResponse = __setResponse;

module.exports = child_process;
