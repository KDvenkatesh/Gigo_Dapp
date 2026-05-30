const https = require('https');

https.get('https://api.github.com/repos/KDvenkatesh/Gigo_Dapp/actions/runs', {
  headers: {
    'User-Agent': 'Node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    const runs = JSON.parse(data).workflow_runs;
    if (runs && runs.length > 0) {
      const latestRun = runs[0];
      console.log(`Latest Run ID: ${latestRun.id}`);
      console.log(`Status: ${latestRun.status}, Conclusion: ${latestRun.conclusion}`);
      
      // Fetch jobs for this run
      https.get(latestRun.jobs_url, {
        headers: { 'User-Agent': 'Node.js' }
      }, (jobRes) => {
        let jobData = '';
        jobRes.on('data', chunk => { jobData += chunk; });
        jobRes.on('end', () => {
          const jobs = JSON.parse(jobData).jobs;
          const failedJob = jobs.find(j => j.conclusion === 'failure');
          if (failedJob) {
            console.log(`Failed Job: ${failedJob.name}`);
            
            // Try to fetch logs for this job
            // The logs might need authentication, but let's try the HTML URL
            console.log(`View logs at: ${failedJob.html_url}`);
            
            // Also print steps
            console.log('Steps:');
            failedJob.steps.forEach(step => {
              if (step.conclusion === 'failure') {
                console.log(`  -> FAILED: ${step.name}`);
              } else {
                console.log(`  - ${step.name} (${step.conclusion})`);
              }
            });
          }
        });
      });
    }
  });
}).on('error', err => {
  console.log('Error: ', err.message);
});
