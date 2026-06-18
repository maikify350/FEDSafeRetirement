# Client Beta Rollout Checklist

## FedSafeRetirement Example

- [ ] Confirm pilot sponsor/contact.
- [ ] Confirm pilot user list.
- [ ] Confirm beta tester emails are Google accounts.
- [ ] Add users/group to private Chrome Web Store tester list.
- [ ] Create tenant in backend.
- [ ] Assign seats.
- [ ] Add ACT database ID/name.
- [ ] Enable only beta-safe features.
- [ ] Send install instructions.
- [ ] Schedule feedback call.
- [ ] Monitor license events.
- [ ] Monitor error logs.
- [ ] Collect issues in tracker.

## First Beta Feature Flags

Recommended initial flags:

```json
{
  "copilot_drawer": true,
  "letter_ai_templates": true,
  "ai_rules": true,
  "dom_write_actions": false,
  "admin_tools": false,
  "debug_panel": true,
  "telemetry": true
}
```

## Success Criteria

- [ ] Users can install without side-loading.
- [ ] Licensed users see extension UI.
- [ ] Unlicensed users do not see premium features.
- [ ] No ACT credentials appear in extension storage.
- [ ] Errors are logged with enough context to troubleshoot.
- [ ] Client can be disabled server-side without reinstall.
