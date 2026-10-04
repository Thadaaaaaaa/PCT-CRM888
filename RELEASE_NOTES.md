# Main app release — 2026-10-05

- Approved Charcoal shared navigation, including Customer; Customer form renderer and question definitions are unchanged and checksum-tested.
- Operations Console design, always-visible Appointment Area viewer and single full-editor link, restored postcode zone reference.
- Manager items excluded from global search; this UI gate is NOT server-side security. Do not store confidential Manager data in public assets.
- Knowledge error-code data (483,862 bytes) now loads only when Knowledge is opened, with request sharing, reuse and retry. Excel parser also remains lazy-loaded.
- Lightweight dependency-free quality checks, path-filtered workflow and cancellation of superseded test runs. Existing Pages deployment configuration is unchanged. Quality checks report issues but do not block the existing Pages deployment.
- Existing browser-local catalog records take precedence. The latest screenshot differs from the open browser in Operations/Manager counts; seed catalog remains unchanged pending an authoritative export. No invented entries or deletions.
- No Excel files, customer case exports, local backups or separate design prototype are included in this release.
