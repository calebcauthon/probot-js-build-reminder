module.exports = (robot) => {
  // Your code here
  robot.log('Yay, the app was loaded!')

  // For more information on building apps:
  // https://probot.github.io/docs/

  // To get your app running against GitHub, see:
  // https://probot.github.io/docs/development/
  const warningMessage = "JS Needs Compiled, run `npm build js` and commit";
  const relieveWarningPattern = /builds\/app\.js/
  const causeWarningPattern = /client_portal\/.+\.js/

  robot.on('pull_request', async context => {

    const pullRequest = context.issue();
    context.github.pullRequests.getCommits(pullRequest).then(commits => {
        const commitSummary = [];
        const commitPromises = [];
        const latestSha = commits['data'][commits['data'].length-1]['sha']

        for (var i = 0; i < commits['data'].length; i++) {
            const thisCommit = commits['data'][i]

            const sha = thisCommit['sha'];

            const issue = context.issue()
            const params = {owner: issue.owner, repo: issue.repo, sha: sha}

            const thisSummary = {
                commit: sha,
                causesWarning: false,
                relievesWarning: false
            }
            commitSummary.push(thisSummary);

            const commitPromise = context.github.repos.getCommit(params)
            commitPromises.push(commitPromise)
            commitPromise.then(commit => {
                const files = commit['data']['files']
                files.forEach(file => {
                    if (file['filename'].match(causeWarningPattern)) {
                        thisSummary.causesWarning = true;
                    }

                    if (file['filename'].match(relieveWarningPattern)) {
                        thisSummary.relievesWarning = true;
                    }
                });
            })
        }


        Promise.all(commitPromises).then(() => {
            let needsWarning = false;
            let relievesWarning = false;

            commitSummary.forEach(summary => {
                if (summary.causesWarning) {
                    needsWarning = true;
                    relievesWarning = false;
                }

                if (summary.relievesWarning) {
                    relievesWarning = true;
                }
            })

            if (needsWarning) {
                if(!relievesWarning) {
                    const statusParams = {
                        owner: pullRequest.owner,
                        repo: pullRequest.repo,
                        sha: latestSha,
                        state: 'failure',
                        description: 'Needs to build JS',
                        context: 'C3 JavaScript'
                    }
                    context.github.repos.createStatus(statusParams)
                } else if (relievesWarning) {
                    const statusParams = {
                        owner: pullRequest.owner,
                        repo: pullRequest.repo,
                        sha: latestSha,
                        state: 'success',
                        description: 'JS is compiled',
                        context: 'C3 JavaScript'
                    }
                    context.github.repos.createStatus(statusParams)
                }
            }
        });
    })
  })
}
