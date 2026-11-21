# Card Playbook (phone version)

The Home Screen version of Card Playbook, served by GitHub Pages.

- `index.html` holds only the app's code. No personal data is ever committed in plain text.
- `data.enc.json` holds your cards, balances, offers and sync log, encrypted with a key that was created on your phone. The private half of that key stays on the phone, so this file is unreadable anywhere else.
- `pubkey.json` is the public half of that key (safe to share; it can only lock data, not unlock it).
- `tools/build.mjs` rebuilds `index.html` and `data.enc.json` from the Card Playbook artifact. A nightly scheduled task runs it after the Gmail sync.

## Public app (`app/`)

`app/index.html` is a version anyone can use: a getting-started screen lets each person search `app/cards.json` (about 60 popular U.S. cards) and pick their own cards. Their data stays in their own browser. Optional Gmail sync reads their card purchase alerts in the browser using the Google client ID in `app/config.json` (invite-only while the Google project is in Testing).
