# Claude Build Readiness Checklist

Claude should not start coding until these items are decided or stubbed.

## Product Decisions

- [ ] Extension product name.
- [ ] Beta listing name.
- [ ] Production listing name.
- [ ] Publisher name.
- [ ] Support email.
- [ ] Backend API base URL.
- [ ] Privacy policy URL.
- [ ] Supported ACT hostnames.

## Licensing Decisions

- [ ] Tenant identifier model.
- [ ] Seat assignment model.
- [ ] ACT database ID/name matching approach.
- [ ] Feature flag schema.
- [ ] Kill switch fields.
- [ ] Session token TTL.
- [ ] Audit event schema.

## Chrome Decisions

- [ ] Required permissions.
- [ ] Host permissions.
- [ ] Content script matching pattern.
- [ ] Side panel vs drawer vs popup.
- [ ] Onboarding/login flow.
- [ ] Offline/error behavior.

## Security Decisions

- [ ] No ACT credentials in extension.
- [ ] No remotely hosted code.
- [ ] No static secrets in package.
- [ ] HTTPS-only backend.
- [ ] Least-privilege host permissions.
- [ ] Sanitized logs.

## Release Decisions

- [ ] Dev local package path.
- [ ] Beta build naming.
- [ ] Production build naming.
- [ ] Version increment process.
- [ ] Store upload ZIP structure.
