# My Fund Dashboard

Mobile-first dashboard for RBF460 and RBF266 showing latest published daily NAV, current personal value, gain/loss, return, and history charts. Personal holdings are stored only in the browser via localStorage and are not committed to this repository.

## Automatic updates
`update-nav.yml` runs after market hours on business days, retrieves recent daily observations, validates them, runs the JS/Python tests, and commits only validated NAV changes. Failed retrieval leaves the prior history intact. The schedule is 02:30 UTC Tuesday–Saturday (22:30 EDT / 21:30 EST on the preceding business day). After a successful NAV workflow, the Pages workflow deploys the latest main branch, including bot commits. GitHub may delay scheduled runs.

## Deploy
In GitHub: **Settings → Pages → Source: GitHub Actions**. The included Pages workflow follows GitHub's official custom Pages flow.

## iPhone
Open the Pages URL in Safari → Share → **Add to Home Screen**.

## Private setup
Open the deployed URL with your private `#portfolio=` fragment once. The browser validates and saves it locally, then clears the fragment from the address bar. Never add private setup files or real holdings to this repository. The chart creates its purchase baseline from local settings. Public history contains only fetched market observations.

## Verification
Run `npm test` and `python -m pytest -q`. Only `index.html`, `manifest.webmanifest`, `.nojekyll`, `src/`, `assets/`, and `data/` enter the Pages artifact.
