# crowdin-helper

Unofficial Crowdin client to automate continuous integration workflow.

(Since version 1.0.0-rc.1 is not dependent on the official Crowdin CLI)

This is a current version, which we experiment with to use in our team's workflow. For now some things are harcoded inside, accordingly to our own needs. You're welcome to use it as a source of inspiration, fork it and modify code to make it usable in your projects. We would appreciate any kind of feedback, suggestions, pull requests.

#### Disclaimer:
Crowdin and the Crowdin API are the property of Crowdin, LLC.

## Changes in 1.0.0-rc.1

- It is not dependent on Crowdin CLI anymore
- `projectKey` and `projectIdentifier` have to be configured in `crowdin-helper.json` in the root of your project
- Automatic translation (in case of "perfect match" with Translation Memory) is triggered after each file upload and progress checking on master branch (you can also disable this if you want)

## Installation from npm
`npm i crowdin-helper --save-dev`

## Installation from GitHub
`npm i git+https://git@github.com/yuriykuzin/crowdin-helper --save-dev`

## Post-installation recommended steps

##### Step 1
Add crowdin-helper.json to the root of your project. Here is an example:

```
{
  "projectIdentifier": "my-project-name",
  "projectKey": "my-project-api-key",
  "source": "/src/i18n/en.json",
  "translation": "/src/i18n/%two_letters_code%.json",
  "languageToCheck": "nl",
  "languagesToAutoTranslate": ["nl", "fi"],
  "daysSinceLastUpdatedToDeleteBranchSafely": 3,
  "minutesSinceLastMasterMergeToPurgeSafely": 20,
  "disableAutoTranslation": false
}
```

Also, you can use patterns in "source" property:

```
  "source": "/**/en.json"
```

##### Step 2
In our project we add these shorcuts to "scripts" section in package.json:

```
{
  ...
  "scripts": {
    ...
    "crowdin-progress": "crowdin-helper progress",
    "crowdin-up": "crowdin-helper up",
    "crowdin-down": "crowdin-helper down"
  },
  ...
}
```

##### Step 3
We use pre-push git hook that upload translation sources to crowdin before pushing files to the github branch. You can create in the root file named `pre-push.sh` that contains:

```
#!/bin/bash

echo "Checking if en.json changed...";

node ./node_modules/crowdin-helper/crowdin-helper pre-push
```

##### Step 4
To set it up automatically on each `npm install`, you can create file `setup-hooks.sh`:

```
#!/bin/bash

echo "Installing git hooks..."

if [[ -d .git ]]; then
  [[ -L .git/hooks/pre-push ]] && rm .git/hooks/pre-push;
  ln -s ../../pre-push.sh .git/hooks/pre-push;
  echo -e "Successfully installed!"
else
  echo -e "No .git directory, probably we're under node_modules"
fi;
```
and add to "scripts" in package.json this line:
`"postinstall": "bash ./setup-hooks.sh",`

##### Step 5
We're using https://semaphoreci.com for building and deploying our github branches. If you do it as well, you can add a job to build settings (https://semaphoreci.com/%your_account_name%/%your_project_name%/settings):

`npm run crowdin-progress`

If you do so, you will be able to merge branch only if relevant translations on crowdin are ready.

Also, we're using the following "After job" on Semaphore to automate cleaning up outdated crowdin branches:

```
if [ "$BRANCH_NAME" = "master" ]; then sleep 20m && node ./node_modules/crowdin-helper/crowdin-helper.js purge ; fi
```

## Usage
Here we describe our current process.

#### The context:
- In our git branch convention we name branches like `story/team-1234/develop-new-feature` (we use '/' symbol and never use double minus '--' in a branch name. Crowdin doesn't allow use '/' in a branch name, so we replacing '/' with '--' when generation crowdin branch name)

- Currently we consider translation to only one language as critical ('NL'). That means we don't want merge into master some branch which contains some missing translations since we deploying master branch to production automatically

#### The flow:

1. When a developer working on a feature, changes translation source file (en.json in our case) and then calls `git push`, pre-push hook will be invoked and translation source will be autimatically uploaded to crowdin (a proper crowdin branch will be created).

2. Semaphore's build linked to a github pull request will pass only if the current branch on crowdin is 100% translated into chosen language. Also, a developer can check readiness manually calling `npm run crowdin-progress`.

3. When semaphore shows green-light (translation progress is 100%), a developer calls `npm run crowdin-down` to download translations, then commit and push them adding to existing pull request. Then pull request can be merged to master branch and deployed.

**Please note:** Before downloading crowdin branch (as described in step 3) crowdin-helper will check if you have the last commit from the source file (e.g. `src/i18n/en.json`) from the master in your current branch. If not, you'll be asked to merge master branch into your own, then perform uploading sources to crowdin (as described in the step 1 or call `./node_modules/crowdin-helper/crowdin-helper.js up` and then try to download translations again). If you want to skip this check, you can simply call `./node_modules/crowdin-helper/crowdin-helper.js down --force`.

**Please note:** To be on a safe side, translation sources will be uploaded to crowdin automatically if you call translations downloading.

We're using also "pre-translate" API call to trigger auto translation for new string with "Perfect match" in Translation Memory. This is useful, because some developer can rename certain translation key, but the translation remains the same. You can swithc it off in `crowdin-helper.json` configuration file: `"disableAutoTranslation": true`

## Removing unnecessary crowdin branches:
From time to time one of team leads calls `./node_modules/crowdin-helper/crowdin-helper.js purge` that removes branches which meet following criterias:

- crowdin branch do not have relevant branch on github (in our process we delete a branch on github after merging PR into master),

- at least 3 days passed after last updating branch(is configured in "daysSinceLastUpdatedToDeleteBranchSafely" of crowdin-helper.json),

- at least 20 minutes passed since last merge to github master (is configured in "minutesSinceLastMasterMergeToPurgeSafely" of crowdin-helper.json) - so we can be sure that crowdin performed all syncronization with master branch and took necessary translations from feature crowdin-branch.

## Contributing
1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

## License and Author
Author: Yuriy Kuzin

This project is licensed under the MIT license, a copy of which can be found in the LICENSE file.