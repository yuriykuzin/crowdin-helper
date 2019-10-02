#!/usr/bin/env node

//   node crowdin-helper [options] [command]

//   COMMANDS
//   up              - Uploads source file to the current branch in crowdin (evaluated from GIT branch)
//   down            - Downloads translations from the current branch in crowdin (evaluated from GIT branch)
//                      (it will fail if the last commit in source file from the master is not merged
//                       to the current branch)
//   down --force    - Same as previous, but without master merge checking (less safe, not recommended)
//   progress        - Shows progress status on current branch. Exit with error if incomplete
//   pre-push        - Checks if source file differs from master and if yes, uploads source file to crowdin
//   purge           - Delete all unused branches from crowdin (each branch without relevant GIT branch)
//   auto-translate  - Trigger auto-translation (from TM, with perfect-match)
//
//   OPTIONS
//   -c, --config    - Path to config file
//   -b, --branch    - Set branch name to work on (instead of taking current one from git)

const configOptionMatches = process.argv.join(' ').match(/((?:\-c|\-\-config)[\s=]+)(\S*)/i);
require('./lib/utilities/config-manager').init(configOptionMatches && configOptionMatches[2]);

const downloadTranslations = require('./lib/commands/download-translations');
const uploadSources = require('./lib/commands/upload-sources');
const checkProgressOnBranch = require('./lib/commands/check-progress-on-branch');
const triggerAutoTranslation = require('./lib/commands/trigger-auto-translation');
const deleteOldBranches = require('./lib/commands/delete-old-branches');

switch(process.argv[2]) {
  case 'purge':
    deleteOldBranches();
    break;

  case 'up':
    uploadSources();
    break;

  case 'down':
    const shouldIgnoreUnmergedMaster = process.argv[3] === '--force';
    downloadTranslations(shouldIgnoreUnmergedMaster);
    break;

  case 'progress':
    checkProgressOnBranch();
    break;

  case 'auto-translate':
    triggerAutoTranslation();
    break;

  case 'pre-push':
    uploadSources(true);
    break;

  default:
    console.log(`
      Crowdin Helper

      node crowdin-helper [options] [command]

      COMMANDS
      up              - Uploads source file to the current branch in crowdin (evaluated from GIT branch)
      down            - Downloads translations from the current branch in crowdin (evaluated from GIT branch)
                        (it will fail if the last commit in source file from the master is not merged
                          to the current branch)
      down --force    - Same as previous, but without master merge checking (less safe, not recommended)
      progress        - Shows progress status on current branch. Exit with error if incomplete
      pre-push        - Checks if source file differs from master and if yes, uploads source file to crowdin
      purge           - Delete all unused branches from crowdin (each branch without relevant GIT branch)
      auto-translate  - Trigger auto-translation (from TM, with perfect-match)

      OPTIONS
      -c, --config    - Path to config file
      -b, --branch    - Set branch name to work on (instead of taking current one from git)
    `);
}
