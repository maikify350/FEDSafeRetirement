# Chrome Store Review Checklist

## Before Upload

- [ ] `manifest.json` is at ZIP root.
- [ ] Manifest version is incremented.
- [ ] No `.env` files in ZIP.
- [ ] No source maps unless intentionally included.
- [ ] No `node_modules` in ZIP.
- [ ] No secret keys in ZIP.
- [ ] No remote script URLs.
- [ ] No `eval` or `new Function`.
- [ ] No unnecessary permissions.
- [ ] No `<all_urls>` unless justified.
- [ ] Icons included.
- [ ] Extension loads locally.
- [ ] License failure state tested.
- [ ] License success state tested.

## Store Form

- [ ] Name filled.
- [ ] Short description filled.
- [ ] Detailed description filled.
- [ ] Screenshots uploaded.
- [ ] Category selected.
- [ ] Privacy policy URL added.
- [ ] Support URL added.
- [ ] Single purpose declared.
- [ ] Data collection disclosure completed.
- [ ] Limited Use certification completed if applicable.
- [ ] Permissions justified.
- [ ] Test instructions provided.
- [ ] Visibility set correctly: Private for beta, Unlisted for production.

## After Submission

- [ ] Save extension ID.
- [ ] Save Chrome Web Store URL.
- [ ] Add extension ID to backend allowed store items.
- [ ] Add install link to private install page.
- [ ] Create enterprise policy JSON using real extension ID.
