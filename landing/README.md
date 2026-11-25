# Placebo waitlist page

A single static page (`index.html` plus `favicon.png`), with no build step. Fonts load from Google Fonts. Everything else is inline.

## Turn on signups
Signups are off until a form backend is chosen. Until then the form tells people plainly that nothing was saved. To connect one:

1. Create a free form endpoint that accepts a JSON POST. Formspree, Basin and Getform all work.
2. Set `FORM_ENDPOINT` near the top of the `<script>` in `index.html` to that URL.
3. Add a line to `docs/privacy-policy.md` saying the website collects an email address for the waitlist, who stores it (the form service), and how to ask for removal.

## Host it
- **GitHub Pages:** go to Settings, then Pages, then deploy from a branch: `main`, folder `/landing`. GitHub Pages only offers `/` or `/docs`, so either move the files to `/docs` or use a Pages Action that uploads `landing/`.
- **Vercel or Netlify:** import the repo and set the root directory to `landing`. Use no framework and no build command.
- To point a domain at it, add it in the host's settings.
