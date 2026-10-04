# Main app release — 2026-10-05

## Personal Quick Access

- User approved publication. Floating translucent shortcut button on all pages, retaining the original charcoal lightning symbol with a soft orange aura only.
- Public catalog shortcuts and custom HTTP/HTTPS links; direct new-tab opening. Manager is excluded. External sites control their own tab titles.
- Favorites are browser/profile-local, not synced per account. No personal favorites or browser storage are included in this release.
- Verified persistence, custom add/remove, new Google My Maps tab and protected Customer checksum tests. Added shortcut safety tests to CI.

- Approved Charcoal shared navigation, including Customer; Customer form renderer and question definitions are unchanged and checksum-tested.
- Operations Console design, always-visible Appointment Area viewer and single full-editor link, restored postcode zone reference.
- Manager items excluded from global search; this UI gate is NOT server-side security. Do not store confidential Manager data in public assets.
- Knowledge error-code data (483,862 bytes) now loads only when Knowledge is opened, with request sharing, reuse and retry. Excel parser also remains lazy-loaded.
- Lightweight dependency-free quality checks, path-filtered workflow and cancellation of superseded test runs. Existing Pages deployment configuration is unchanged. Quality checks report issues but do not block the existing Pages deployment.
- Existing browser-local catalog records take precedence. The latest screenshot differs from the open browser in Operations/Manager counts; seed catalog remains unchanged pending an authoritative export. No invented entries or deletions.
- No Excel files, customer case exports, local backups or separate design prototype are included in this release.
