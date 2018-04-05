#!/usr/bin/env node

//   node crowdin-helper [command]

//   COMMANDS
//   up            - Uploads source file to the current branch in crowdin (evaluated from GIT branch)
//   down          - Downloads translations from the current branch in crowdin (evaluated from GIT branch)
//                  (it will fail if the last commit in source file from the master is not merged to the current branch)
//   down --force  - Same as previous, but without master merge checking (less safe, not recommended)
//   progress      - Shows progress status on current branch. Exit with error if incomplete
//   pre-push      - Checks if source file differs from master and if yes, uploads source file to crowdin
//   purge         - Delete all unused branches from crowdin (each branch without relevant GIT branch)


const fetch = require('node-fetch');
const spawn = require('child_process').spawnSync;
const fs = require('fs');

const _COLOR_GREEN = '\x1b[32m';
const _COLOR_RED = '\x1b[31m';
const _COLOR_WHITE = '\x1b[37m';


// Reading config files:
//
// 1 - crowdin CLI config (crowdin.yml)

if (!fs.existsSync('crowdin.yml')) {
  console.log(`Crowdin: ${_COLOR_RED}Error: crowdin.yml is missing`);
  console.log(`${_COLOR_WHITE}Crowdin: Please generate config file using crowdin CLI and fill project_identifier, api_key, source file name`);

  process.exit(1);
}

const crowdinYml = fs.readFileSync('crowdin.yml', 'utf8');

// 2 - crowdin-helper.json config

let crowdinHelperJson = {};

if (fs.existsSync('crowdin-helper.json')) {
  try {
    crowdinHelperJson = JSON.parse(fs.readFileSync('crowdin-helper.json', 'utf8'));
  } catch (err) {
    console.log(`Crowdin: ${_COLOR_RED}Error: crowdin-helper.json is invalid`);
    console.log(`${_COLOR_WHITE}Crowdin: Please fix or remove it`);

    process.exit(1);
  }
}

const config = {
  projectIdentifier: crowdinYml.match(/project_identifier"?:\W+?"?(.+)"?/)[1],
  projectKey: crowdinYml.match(/api_key"?:\W+?"?(.+)"?/)[1],
  sourceFile: crowdinYml.match(/source"?:\W+?"?(.+)"?/)[1],
  languageToCheck: crowdinHelperJson.languageToCheck || 'nl',
  daysSinceLastUpdatedToDeleteBranchSafely: crowdinHelperJson.daysSinceLastUpdatedToDeleteBranchSafely || 3,
  minutesSinceLastMasterMergeToPurgeSafely: crowdinHelperJson.minutesSinceLastMasterMergeToPurgeSafely || 20,
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////

if (process.argv[2] === 'purge') {
  const minutesFromLastMasterMerge = getDateDiffInMinutes(getLastCommitToMasterDate(), new Date());

  if (minutesFromLastMasterMerge < config.minutesSinceLastMasterMergeToPurgeSafely) {
    console.log('Last merge to master was performed less than '
      + config.minutesSinceLastMasterMergeToPurgeSafely
      + ' minutes ago. It is not safe to purge crowdin branches now');

    console.log(`${_COLOR_GREEN}Please retry later`);

    process.exit(1);
  }

  fetch(
    `https://api.crowdin.com/api/project/${ config.projectIdentifier }/info?`
      + `key=${ config.projectKey }&json`,
    { method: 'POST' }
  )
    .then(res => res.json())
    .then(json => {
      const crowdinBranches = json.files.filter(file => file.node_type === 'branch');
      const gitBranchesConverted = getGitRemoteBranches().map(gitBranch => gitBranch.replace(/\//g, '--'));
      let isSomeBranchesDeleted = false;

      crowdinBranches.forEach((branch) => {
        const daysSinceLastBranchUpdate = getDateDiffInDays(
          new Date(getFileLastUpdated(branch)),
          new Date()
        );

        if (
              gitBranchesConverted.indexOf(branch.name) === -1
          && daysSinceLastBranchUpdate > config.daysSinceLastUpdatedToDeleteBranchSafely
        ) {
          isSomeBranchesDeleted = true;

          fetch(
            `https://api.crowdin.com/api/project/${ config.projectIdentifier }/delete-directory?`
              + `key=${ config.projectKey }&name=${ branch.name }`,
            { method: 'POST' }
          )
            .then((res) => {
              console.log(`Branch "${ branch.name }" is removed from crowdin`);
            })
            .catch(e => {
              console.log(`Failed to remove branch ${ branch.name } from crowdin`, e);
            });
        }
      });

      if (!isSomeBranchesDeleted) {
        console.log('All branches are actual. Nothing to delete');
      }
    });

  return;
}

const gitBranchName = spawn('git', [ 'rev-parse', '--abbrev-ref', 'HEAD' ])
  .stdout
  .toString()
  .split('\n')
  [0];

console.log(`Crowdin: Working on git branch: ${ gitBranchName }`);

const crowdinBranchName = gitBranchName.replace(/\//g, '--');

if (process.argv[2] === 'up') {
  uploadSources(crowdinBranchName);

  return;
}

if (process.argv[2] === 'down') {
  if (process.argv[3] !== '--force' && !isLastSourceFileFromMasterMergedIntoCurrent()) {
    console.log(`Crowdin: ${_COLOR_RED}Please merge last master into your branch and upload sources to crowdin `
      + `before attempting to download last translations`);

    process.exit(1);
  }

  console.log('Crowdin: Uploading sources before downloading');

  uploadSources(crowdinBranchName);

  console.log('Crowdin: Downloading branch:', crowdinBranchName);

  spawn('crowdin', [ 'download', '-b', crowdinBranchName ], { stdio: 'inherit' });

  console.log(`Crowdin: ${_COLOR_GREEN}Done!`);

  return;
}

if (process.argv[2] === 'progress') {
  checkProgressOnBranch(crowdinBranchName);

  return;
}

if (process.argv[2] === 'pre-push') {
  if (isSourceFileDiffersFromMaster()) {
    uploadSources(crowdinBranchName);
  }

  return;
}

console.log(`
  Crowdin Helper

  node crowdin-helper [command]

  COMMANDS
  up            - Uploads source file to the current branch in crowdin (evaluated from GIT branch)
  down          - Downloads translations from the current branch in crowdin (evaluated from GIT branch)
                  (it will fail if the last commit in source file from the master is not merged to the current branch)
  down --force  - Same as previous, but without master merge checking (less safe, not recommended)
  progress      - Shows progress status on current branch. Exit with error if incomplete
  pre-push      - Checks if source file differs from master and if yes, uploads source file to crowdin
  purge         - Delete all unused branches from crowdin (each branch without relevant GIT branch)
`);


// Functions:

function checkProgressOnBranch(branchName) {
  console.log('Crowdin: Checking language:', config.languageToCheck);

  fetch(
    `https://api.crowdin.com/api/project/${ config.projectIdentifier }/language-status?`
      + `key=${ config.projectKey }&json&language=${ config.languageToCheck }`,
    { method: 'POST' }
  )
    .then(res => res.json())
    .then(json => {
      const currentBranch = json.files.filter(file => {
        return file.node_type === 'branch'
            && file.name === branchName;
      })
        [0];

      if (!currentBranch) {
        console.log(`Crowdin: ${_COLOR_GREEN}Okay, no such branch on crowdin`);

        return;
      }

      if (currentBranch.phrases === 0) {
        console.log(`Crowdin: ${_COLOR_GREEN}Okay, no new phrases in this branch`);

        return;
      }

      if (branchName === 'master') {
        console.log(`Crowdin: ${_COLOR_GREEN}No validation performed since it is a master branch`);

        return;
      }

      if (currentBranch.translated === currentBranch.phrases) {
        console.log(`Crowdin: ${_COLOR_GREEN}Okay, translations are ready`);

        return;
      }

      console.log(`Crowdin: translated ${ currentBranch.translated } / ${ currentBranch.phrases }`);
      console.log(`Crowdin: ${_COLOR_RED}Error: There are some missing translations`);

      process.exit(1);
    });
}

function uploadSources(branchName) {
  console.log('Crowdin: Uploading to branch:', branchName);

  spawn('crowdin', [ 'upload', '-b', branchName ], { stdio: 'inherit' });
}

function getGitRemoteBranches() {
  const child = spawn('git', [ 'ls-remote', '--heads' ]);

  return child.stdout.toString().match(/refs\/heads\/.+/g).map(s => s.replace('refs/heads/', ''));
}

function isSourceFileDiffersFromMaster() {
  const child = spawn('git', ['diff', 'origin/master', 'HEAD', '--stat', '--name-only']);

  return child.stdout.indexOf(config.sourceFile) !== -1;
}

function getFileLastUpdated(crowdinBranchObj) {
  return crowdinBranchObj.node_type === 'file'
    ? crowdinBranchObj.last_updated
    : getFileLastUpdated(crowdinBranchObj.files[0]);
}

function getDateDiff(date1, date2, ms) {
  const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate(), date1.getHours(), date1.getMinutes());
  const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate(), date2.getHours(), date2.getMinutes());

  return Math.floor((utc2 - utc1) / ms);
}

function getDateDiffInDays(date1, date2) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;

  return getDateDiff(date1, date2, _MS_PER_DAY);
}

function getDateDiffInMinutes(date1, date2) {
  const _MS_PER_MINUTE = 1000 * 60;

  return getDateDiff(date1, date2, _MS_PER_MINUTE);
}

function getLastCommitToMasterDate() {
  spawn('git', ['fetch']);
  const child = spawn('git', ['log', '-1', '--format=%cd', 'origin/master']);

  return new Date(child.stdout.toString());
}

function isLastSourceFileFromMasterMergedIntoCurrent() {
  spawn('git', ['fetch']);

  const commitId = spawn('git', ['log', '-1', '--pretty=format:"%H"' , 'origin/master', config.sourceFile])
    .stdout
    .toString()
    .replace(/"/g, '');

  const isCurrentBranchContainsThisCommit = spawn('git', ['branch', '--contains', commitId])
    .stdout
    .toString()
    .indexOf(gitBranchName) !== -1;

  return isCurrentBranchContainsThisCommit;
}
