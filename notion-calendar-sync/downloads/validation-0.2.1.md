# Windows and Intel Mac validation · 2026-11-09

Release **0.2.1** fixes Windows installer recovery/license copying and completes native platform validation. No existing Pi service, calendar item, database row or account credential file was modified by the release tests. Live provider tests created only uniquely owned disposable records and cancelled/trashed them afterward.

## Native target execution

| Check | Native Intel macOS | Native Windows x64 |
| --- | --- | --- |
| Host | macOS 15.7.9, x86_64, no Rosetta | Windows Server 2025, build 26100, AMD64 |
| Python | 3.14.7 | 3.14.10 |
| Full suite | 265 passed; one Windows-only test skipped (266 run) | 266 tests passed, no skips |
| Complete desktop setup/sync acceptance | 43 checks passed | 43 source checks plus 43 checks using the shipped portable runtime passed |
| Native storage/platform checks | 19 passed | 21 passed |
| Packaged setup window | Passed | Portable and frozen executable passed |
| Frozen executable supervisor restart after process death | Covered by engine recovery suite | Real child process killed; replacement window/process recovered successfully |

The hosted Intel run is [here](https://github.com/JulioM1823/JulioM1823.github.io/actions/runs/42669531774). Its Windows job exposed three platform-specific test failures; they were corrected and the [Windows rerun passed](https://github.com/JulioM1823/JulioM1823.github.io/actions/runs/42670094802). The [separate frozen Windows lifecycle run](https://github.com/JulioM1823/JulioM1823.github.io/actions/runs/42671427920) tested the exact executable inside the downloadable native ZIP. These jobs used a separate validation branch containing allowlisted, credential-scanned open-source code; the website's main branch was not changed. No real OAuth tokens were sent to hosted runners.

Native credentials were exercised through actual Keychain/Credential Manager calls in unique disposable namespaces, including large Windows grants, replacement, deletion, refresh-storage hooks and absence of plaintext credential files. Process locks were tested across real processes. Startup serialization/removal was tested in isolated homes/registry keys; real startup preferences were not changed. The Windows executable also opened a normal fresh-profile setup window and restarted an owned child after a forced crash. [Intel platform report](macos-native-hosted-intel.json), [Windows platform report](windows-native-hosted-windows.json), [frozen lifecycle report](frozen-windows-hosted.json).

## Full setup and consistency acceptance

The 43-check acceptance driver uses the actual DesktopController, official Notion/Google adapters, merge engine, journal and SQLite, with controlled REST/token responses and a real local OAuth callback server. It tests discovery/duplicate names/schema/property creation confirmation, typed mapping, preview/approval, creation/edit/rescheduling in both directions, timed/all-day/DST conversion, conflicts and independent concurrent edits, explicit two-way deletion, recurring series/instances, expired sync tokens, permission/network failures, duplicate notifications/reconciliation, diagnostics redaction, and restart after a remote create committed before local acknowledgment.

All five fixture relationships retained unique identities. No incomplete journal operations or detected content/metadata loss remained. These tests establish platform and application behavior; controlled responses are explicitly distinguished from live account grants. [Intel acceptance](acceptance-hosted-intel.json), [Windows source acceptance](acceptance-hosted-windows.json), [Windows packaged acceptance](windows-portable-acceptance-hosted-windows.json).

## Actual Notion and Google APIs

A separate x86_64/Rosetta run on the user's Mac reused existing authorized grants, held them temporarily in an isolated native Keychain namespace, and exercised **23 live checks** with the actual controller, engine, adapters and SQLite. It used a non-Research Notion category and a different writable calendar from the running Pi mapping. Worker listings were strictly bounded to its own generated IDs, preventing any initial import or write to existing items.

Two logical pairs (two Notion pages and two Google events) passed creation from both sides, edits, rescheduling with a time-zone change, multi-day all-day conversion, controller restart with no extra creates, and deletion from each side. Global read-only test-prefix searches subsequently found zero live copies. All four sync records plus three Google-only reminder probes were positively trashed/cancelled. No pending operations or conflicts remained, SQLite integrity passed, original credential file hashes/mtimes stayed unchanged, and temporary native credentials were removed. Full originals, state and recovery material are retained privately in `secrets/desktop-live-20261109.tar.gz` (excluded from source/downloads). [Redacted live report](desktop-live-intel-20261109.json).

The live check **reused an existing Google authorization**; it did not rerun fresh browser consent for each OS. Fresh consent mechanics were tested with real loopback/PKCE/state and controlled token responses on both native platforms. A new user's Notion grants, Google consent, account policies and network environment still require their own guided setup.

### Reminder preservation and Google normalization

The live audit initially detected `reminders.useDefault=true` becoming `false` after a timed-to-all-day conversion. Read-only inspection and three new Google-only probes established that Google materializes current calendar defaults as explicit event overrides: an empty default remained no alarms, a default popup at 30 minutes remained a popup at 30 minutes, and a custom popup at 37 minutes stayed unchanged. No integration PATCH included a reminders write; no corrective PUT or second write was introduced.

**Current effective alarms were preserved, but the raw inheritance flag was not.** As explicit overrides, these alarms may no longer follow later calendar-default changes. This is a material provider normalization and is not represented as byte-for-byte metadata preservation. The [official reminder semantics](https://developers.google.com/workspace/calendar/api/v3/reference/events) describe `useDefault`; Google's date-type conversion behavior was verified live here. Other unmapped test properties, page content and event metadata were retained. There is no claim of an atomic transaction across the two providers or a guarantee against every future provider change.

## Issues corrected

- Windows installation now copies all license notices, stages the complete program before promotion, restores the previous installation on failed promotion, and keeps a recovery copy after upgrade. Native `cscript` tests exercised fresh install, induced failure/rollback and upgrade without touching real user shortcuts/data.
- Tests now distinguish POSIX file-mode assertions from Windows profile ACL/native-vault guarantees. Content, persistence and native credential checks remain active on Windows.
- ZIP validation uses platform-independent absolute/drive/traversal checks. Its regression fixture accounts for Windows ZipInfo normalizing harmless backslashes before parsing, while retaining rejection of actual escape paths.

## Remaining boundaries

Windows validation ran on Server 2025 with native desktop APIs, not separately on every Windows 10/11 client build. Intel tests ran on a native hosted x86_64 Mac as well as Rosetta; older macOS versions were not exhaustively tested. The downloads are ad-hoc signed/unsigned rather than trusted Developer-ID-notarized/Authenticode releases, so normal OS download approval may be required. Active laptop sleep/offline periods stop synchronization until the computer resumes. Only one service should own a selected data-source/calendar pair across computers.

## Reproduce

```sh
PYTHONPATH=src python -m unittest discover -s tests -v
PYTHONPATH=src python scripts/desktop_acceptance.py --output acceptance.json
# Native macOS:
PYTHONPATH=src python scripts/macos_platform_check.py --bundle 'dist/desktop/Notion Calendar Sync.app' --output macos-native.json
# Native Windows, using the extracted portable application's own runtime:
# runtime/python.exe -I PATH/TO/scripts/windows_platform_check.py --bundle EXTRACTED_APP --output windows-native.json
# runtime/python.exe -I PATH/TO/scripts/desktop_acceptance.py --output portable-acceptance.json
```

The included build workflow runs platform-native probes and packaged-runtime acceptance. `scripts/check-frozen-windows.ps1` is restricted to fresh GitHub Actions profiles, refuses existing desktop settings and cleans up only its own exact executable/process ancestry.
