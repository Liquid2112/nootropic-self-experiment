# Placebo waitlist page

A single static page (`index.html` plus `favicon.png`), with no build step. Fonts load from Google Fonts. Everything else is inline.

## Signups
The form posts to Formspree (`FORM_ENDPOINT` in the `<script>` in `index.html`). Signups show up in the Formspree dashboard, which can export them as a CSV. Formspree confirms a new form the first time it gets a submission, so send one test signup after deploying and click the confirmation email. The privacy policy covers waitlist emails.

## Host it
- **Vercel (recommended, free, works with a private repo):** go to vercel.com, then Add New, then Project. Import this repo and set the root directory to `landing`. Choose framework "Other" with no build command, then click Deploy. You get a `*.vercel.app` URL, and you can add your own domain later.
- **GitHub Pages:** needs a public repo, or a paid plan for private ones. go to Settings, then Pages, then deploy from a branch: `main`, folder `/landing`. GitHub Pages only offers `/` or `/docs`, so either move the files to `/docs` or use a Pages Action that uploads `landing/`.
- **Netlify:** works the same as Vercel, with base directory `landing` and no build command.
- To point a domain at it, add it in the host's settings.
