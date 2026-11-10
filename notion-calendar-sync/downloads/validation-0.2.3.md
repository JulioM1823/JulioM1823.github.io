# Published setup guide acceptance: release 0.2.3

Validated November 9, 2026. The first run used fresh downloads from the published guide for release 0.2.1. It exposed a real Windows CLI failure and documentation gaps. The corrected 0.2.3 artifacts were built, tested on native hosts, and checked again after publication. Test credentials on hosted runners were disposable simulated values; real provider credentials were never uploaded there.

## Issues corrected

- Windows redirected CLI help and JSON could raise `UnicodeEncodeError` with a cp1252 output stream. Help now uses ASCII decoration; JSON escapes Unicode losslessly. Regression tests reproduce both old failures and pass after the fix.
- Mac bundle version metadata previously displayed 0.0.0. The builder now embeds the actual release version in both version fields before signing. Universal and native Intel artifacts report 0.2.3 and pass strict signature-integrity checks.
- The desktop preview previously implied that complete provider originals were backed up. It now states that the automatic backup covers local SQLite/settings only, and calls for separate provider exports.
- The guide now includes checksum commands, explicit headless Pi download/extraction, correct source-directory context, the default-browser/account distinction, OAuth receiver lifetime/recovery and accurate per-file log retention.
- All six missing relative source-documentation targets were fixed. A regression check inspects Markdown links in the downloaded source archive.

Release 0.2.3 adds the provider-save normalization guard described below. It uses the existing SQLite tables and retains item identities; first-sync state is never reset. Existing 0.2.1 download addresses remain available; current guide links use 0.2.3.

## Provider-save preservation fix

Live API probes showed Google changing an explicit 90-minute America/Denver range across the repeated autumn hour into 30 minutes. This was reproduced on the 2026 and 2036 boundaries. UTC timestamps with that named zone, and requests omitting the zone, still changed the result. An explicit UTC event zone preserved the tested instants. All seven standalone Google probes were cancelled and positively verified afterward.

The first live acceptance stopped on this mismatch. Its two pairs were cleaned up, all four records were confirmed trashed/cancelled, no live prefix copies remained and its temporary credentials were removed. That failed run is retained as evidence rather than counted as a passing DST test.

A regression then demonstrated that the old create path could promote a provider-changed value and overwrite its source. The new guard atomically records the remote identity, operation completion, requested/observed values and an open manual conflict. It also protects updates, uncertain responses and explicit resolutions from being silently accepted when the requested mapped fields differ. Automatic conflict policies cannot override the hold. A retained conflict requires explicit review; other pairs continue.

All ten new regressions failed against the isolated old 0.2.2 engine and passed after the fix. They cover both create directions, update baseline preservation, lost responses, restart/crash atomicity, automatic policies, repeated unsuccessful resolution and deliberate UTC resolution. Two UI tests cover the plain-language conflict label and retained details. No automatic UTC or recurrence rewrite was introduced.

## Native operating systems and packages

| Check | Windows x64 | Native Intel Mac | Apple Silicon Mac |
| --- | --- | --- | --- |
| Host | Windows Server 2025, build 26100 | macOS 15.7.9, native x86_64 | macOS 27.2, arm64 |
| Full suite | 282 passed | 281 passed, one Windows-only skip | 281 passed, one Windows-only skip |
| Setup/sync acceptance | 43 checks with exact shipped portable runtime | 43 checks | 43 native plus 43 under Rosetta |
| OS credential/platform checks | 21 checks | 19 checks | 19 checks |
| Launch and recovery | Real VBS/CMD launchers; six frozen-executable lifecycle checks | Actual packaged window, DMG integrity, version and signature checks | Actual Universal DMG window, integrity, versions and signature checks |

Fresh source installation into an isolated virtual environment also passed. Windows was tested with the legacy cp1252 output stream and no UTF-8 workaround for the corrected release. The initial failing 0.2.1 job remains evidence of the defect.

The 43-check acceptance uses the actual desktop controller, official provider adapters, merge engine and SQLite with controlled REST/token responses and a real local OAuth callback. It covers typed discovery and property creation confirmation, preview/approval, both creation/update directions, atomic time changes, all-day/DST boundaries, independent and conflicting edits, duplicate notifications, expiry/retry/restart recovery, recurrence exceptions, permission loss without deletion, both explicit deletion directions, retained tombstones and unrelated metadata/content. All five fixture relationships remained unique; no incomplete operations or detected fixture data loss remained.

An additional Windows run repeated all 43 checks using actual Credential Manager in a unique native namespace, rather than an in-memory vault. All three disposable credential keys were positively deleted afterward. Its provider responses and authorization endpoint remained controlled fixtures.

- [Native Windows/Intel build and validation run](https://github.com/JulioM1823/JulioM1823.github.io/actions/runs/42753246866)
- [Windows full setup with native credential storage](https://github.com/JulioM1823/JulioM1823.github.io/actions/runs/42753246866)
- [Initial public-download run exposing the encoding bug](https://github.com/JulioM1823/JulioM1823.github.io/actions/runs/42746897891)
- [Windows acceptance](validation-0.2.3/windows-acceptance.json), [native platform](validation-0.2.3/windows-native.json), [launchers](validation-0.2.3/windows-launchers.json), [frozen lifecycle](validation-0.2.3/windows-frozen.json), [native-vault acceptance](validation-0.2.3/windows-native-vault-acceptance.json)
- [Intel acceptance](validation-0.2.3/intel-acceptance.json), [native platform](validation-0.2.3/intel-native.json), [bundle version](validation-0.2.3/intel-bundle-version.json)
- [Apple Silicon acceptance](validation-0.2.3/mac-arm64-acceptance.json), [Rosetta acceptance](validation-0.2.3/mac-rosetta-acceptance.json), [native platform](validation-0.2.3/mac-native.json), [Mac summary](validation-0.2.3/mac-summary.json)

## Live provider check

The corrected 0.2.3 run passed **77 recorded assertions across two logical pairs** using the actual controller, official adapters, SQLite and live provider APIs. Scans and writes were restricted to its newly generated IDs in a category/calendar outside the running Pi mapping. The run covered both creation/edit directions, rescheduling/time zones/all-day events, spring DST, independent merges, same-field conflicts while another item continued, date clearing without deletion, repeated reconciliation, restarts, explicit two-way deletion and tombstones.

The repeated-hour test independently saved a 90-minute Notion source before synchronization. Google returned 30 minutes; 0.2.3 retained both versions as an open manual conflict, preserved the source and common time baseline, and made no repeated writes while held. A deliberate UTC choice then preserved the original 90-minute instants on both sides after stale-conflict review. No automatic series-to-UTC conversion was performed.

Mapped values, Notion blocks and the unrelated Done checkbox, plus Google color, transparency, custom reminders, foreign source and private metadata were checked. All four linked resources were positively trashed/cancelled. Final read-only prefix searches found zero live copies across the source and writable Google calendars. No unresolved conflicts or incomplete operations remained, and SQLite integrity/identity uniqueness passed. Temporary native credentials were removed and original credential-file hashes and modification times were unchanged. The production service and existing provider items were not changed.

Fresh real Google browser consent completed on the Mac in the first run. The final regression run reused an existing authorized grant in a new native namespace; it does not claim another fresh consent. Notion access/schema discovery was validated against the existing shared connection.

Live phase durations ranged from 1.84 to 7.39 seconds. These are small **two-item batch/test phases**, including live API and ownership/safety reads. The recorded engine batch timing is separate in JSON. These values are not a single-item benchmark or provider-notification/end-to-end SLA. Push delivery was not tested live.

[Passing live retest](validation-0.2.3/live-retest.json), [first-run failure and verified cleanup](validation-0.2.3/live-first-run.json), [seven Google API probes and cleanup](validation-0.2.3/google-fold-probes.json).


## Boundaries

Native Windows execution used Server 2025, not a separate Windows 10/11 client machine. Windows live Google/Notion credentials and real Google browser consent were not exercised on the hosted runner. The Mac live check and controlled Windows/native-vault evidence establish different claims.

A new Google Cloud project and a new internal Notion connection were not created for every run. Account-side creation instructions were audited against official documentation, and existing connection access was validated. Fresh authorization and host state are distinguished from recreating accounts or expanding permissions.

These apps remain unsigned/ad-hoc signed rather than trusted Authenticode/Developer ID notarized releases. Ordinary download approval, Smart App Control, managed policies, older OS versions and every possible provider behavior are not established by a clean CI launch. The guide documents those limits. No claim is made that testing proves absence of every future duplicate or data-loss scenario, or that two APIs provide one atomic transaction.

## Interactive UI boundary

Native setup windows, real Windows launchers, menu behavior and frozen process recovery were observed. A separate computer-use attempt could inspect and quit the Mac Tk window, but native mouse/keyboard input did not reliably reach its form controls. Passive diagnostics found a responsive event loop and no modal grab; this was not treated as proof of a product defect. A complete interactive wizard click-through was therefore not established. Controller-level complete setup, actual native credential storage and packaged-window tests are reported separately. [Interaction boundary](validation-0.2.3/gui-interaction-boundary.json).

For Google-origin edits, the tool reads what Google actually stores. It cannot reconstruct an intended value that Google changed before the tool observed it. The new guard covers requested mapped write fields and uncertain save results; it is not proof against arbitrary future provider changes to unrelated fields. Keep the state/history when upgrading, and do not downgrade an active normalization hold to a release without this safeguard.
