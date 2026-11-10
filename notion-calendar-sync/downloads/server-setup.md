# Notion-Google Calendar Sync: server setup

Release 0.2.3. Instructions checked against the implementation and official provider documentation on November 9, 2026.

This optional MIT-licensed helper connects the Calendar Database in the PhD Notion system with Google Calendar. The PhD Notion system works without it. You supply your own accounts, database access, credentials and host. This guide describes the Raspberry Pi service, rather than the desktop wizard. Never run independent synchronizers for the same data-source/calendar pair.

The full guide, desktop downloads and privacy policy are at:

- [Integration guide](https://juliom1823.github.io/notion-calendar-sync/)
- [Privacy and data handling](https://juliom1823.github.io/notion-calendar-sync/privacy.html)
- [Source ZIP](https://juliom1823.github.io/notion-calendar-sync/downloads/Notion-Calendar-Sync-0.2.3-Source.zip)
- [Download checksums](https://juliom1823.github.io/notion-calendar-sync/downloads/SHA256SUMS.txt)

## 1. Requirements and backups

Use Raspberry Pi OS or Debian Bookworm/Trixie, arm64 or armhf, with Python 3.11 or newer and administrator access. The installer checks these values. It installs distribution packages and the application locally. The engine has no third-party Python runtime dependencies.

You need a Notion workspace owner able to create an internal connection, permission to edit the Calendar Database, a Google account with owner/writer access to the participating calendar, and permission to create a Google Cloud project and OAuth client. Managed organizations can require administrator approval. A browser computer with Python 3.11 or newer is needed for initial Google authorization; the Pi itself can remain headless, meaning it needs no screen or browser.

Polling uses outbound HTTPS. No public address, domain, paid hosting, paid automation, tunnel or port forwarding is required. The Pi must remain powered on, online and running the worker. Test on a dedicated source/calendar before connecting working data. Export or otherwise back up provider data first. Local SQLite backups are not complete Notion or Google account backups.

## 2. Prepare the Notion schema

A database is a container; a data source owns one table's properties and entries. Select the particular data source containing Calendar Database entries. One database can have several sources. A Notion view filter does not limit this application's API scope.

The following property names are examples. Use the exact names in your own source, or existing property IDs, in the mapping configuration. Every mapped field requires its own distinct property.

| Config key | Example name | Required Notion type | Requirement |
| --- | --- | --- | --- |
| `title` | `Name` | Title | Required; existing title property |
| `date` | `Date` | Date | Required; one range supplies start/end and all-day status |
| `google_event_id` | `NCS Event ID` | Text, API `rich_text` | Required, service-owned stable identity |
| `description` | `Notes` | Text | Optional literal description |
| `location` | `Location` | Text | Optional |
| `timezone` | `NCS Time Zone` | Text | Optional regional IANA zone; supports exact DST handling |
| `google_url` | `Calendar Link` | URL | Optional, service-owned Google event link |
| `recurrence` | `Recurrence` | Text | Optional, required for supported recurring series |
| `sync_enabled` | `Sync enabled` | Checkbox | Optional; only checked, dated entries participate |

Create missing properties manually in Notion for this server route. Do not change existing third-party identity metadata. Formula, Rollup, Relation, Status and other types cannot replace the writable types above. Omit optional mapping keys entirely when unused. There is no separate end-date or all-day column. Do not manually alter the event-ID marker after linking.

## 3. Create and share the Notion connection

1. As workspace owner, open the [Notion Developer portal](https://app.notion.com/developers), then Build → Internal connections → Create a new connection. Choose your workspace and a recognizable name.
2. In Configuration, enable Read content, Insert content and Update content. Comments and user email capabilities are unnecessary.
3. Copy the internal connection API token into protected credential storage. It will be placed in the server's secret environment file, not in TOML or source control.
4. In Content access → Edit access, select the Calendar Database and save. Alternatively use the database's top-right menu → Connections → Add connection. Capabilities alone do not grant database access. Sharing a parent also shares descendants.
5. In the database settings, use Manage data sources → Copy data source ID for the intended source. The server needs this source ID, not the database container ID or the URL's view identifier. Alternatively retrieve the database with the official API and inspect its `data_sources` entries. This app sends `Notion-Version: 2026-03-11` automatically.

Official references: [internal connections](https://developers.notion.com/guides/connections-and-tokens/internal-connections), [capabilities](https://developers.notion.com/reference/capabilities), [database/data-source model](https://developers.notion.com/guides/data-apis/working-with-databases), [copy data source ID](https://developers.notion.com/guides/get-started/upgrade-guide-2025-09-03).

## 4. Configure Google Cloud

OAuth is Google's browser permission flow. The resulting refresh token lets the worker obtain short-lived access tokens without asking for your password or repeating consent every hour.

1. Create/select your project in [Google Cloud Console](https://console.cloud.google.com/). Under APIs & Services → Library, enable Google Calendar API. The Calendar MCP API/server alone is insufficient.
2. Configure Google Auth Platform Branding, Audience and Data Access. Supply your own app name, support email and developer contact. Personal Gmail accounts use External audience. Internal audience is available only to eligible Workspace organizations.
3. While External/Testing, add your account as a test user. Configure these exact requested scopes:

   ```text
   https://www.googleapis.com/auth/calendar.events
   https://www.googleapis.com/auth/calendar.calendarlist.readonly
   ```

4. In Clients → Create client, choose Desktop app. Download the client JSON. Do not create a Web application client, service-account key or API key for this flow.
5. For unattended operation, finish the applicable consent settings, move the external client to In production and authorize again. Calendar refresh tokens issued in Testing normally expire after seven days. Production avoids that testing expiry, but grants can still expire or be revoked. Personal-use verification exceptions may apply; production status is not verification. Managed accounts may require administrator consent.

The app listens on `http://127.0.0.1:PORT/oauth/callback`, choosing an unused port. This loopback address means the computer running authorization. Desktop clients do not need a manually registered web redirect address. The website URL and privacy URL are not callback addresses. Authorization uses random state and PKCE, a one-time proof protecting the code exchange.

The grant can cover calendars accessible to your account; configuration limits this worker to its selected calendar. In Google Calendar, open the chosen calendar's Settings and sharing → Integrate calendar → Calendar ID. Save the stable ID. Read-only/free-busy access is insufficient. `primary` is accepted, but a stable calendar ID is clearer when accounts change.

Official references: [enable APIs](https://developers.google.com/workspace/guides/enable-apis), [consent settings](https://developers.google.com/workspace/guides/configure-oauth-consent), [Desktop client](https://developers.google.com/workspace/guides/create-credentials#desktop-app), [desktop OAuth](https://developers.google.com/identity/protocols/oauth2/native-app), [scopes](https://developers.google.com/workspace/calendar/api/auth), [token expiration](https://developers.google.com/identity/protocols/oauth2#expiration), [verification exceptions](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

## 5. Install on the Pi

Download and extract the source ZIP, or copy the extracted folder over SSH. For a headless Pi, run these from a new installation folder:

```sh
sudo apt-get update
sudo apt-get install -y curl unzip
mkdir -p "$HOME/ncs-install-0.2.3"
cd "$HOME/ncs-install-0.2.3"
curl --fail --location --output Notion-Calendar-Sync-0.2.3-Source.zip \
  https://juliom1823.github.io/notion-calendar-sync/downloads/Notion-Calendar-Sync-0.2.3-Source.zip
curl --fail --location --output Notion-Calendar-Sync-0.2.3-Source.zip.sha256 \
  https://juliom1823.github.io/notion-calendar-sync/downloads/Notion-Calendar-Sync-0.2.3-Source.zip.sha256
sha256sum --check Notion-Calendar-Sync-0.2.3-Source.zip.sha256
unzip Notion-Calendar-Sync-0.2.3-Source.zip
```

Confirm the checksum reports `OK` before extracting. If checking a desktop package instead, run `shasum -a 256 FILENAME.dmg` on macOS or `(Get-FileHash ".\FILENAME.zip" -Algorithm SHA256).Hash` in Windows PowerShell and compare the entire hash with the matching filename in `SHA256SUMS.txt`. Use your actual saved path. Uppercase and lowercase hexadecimal letters are equivalent. Check its checksum against `SHA256SUMS.txt`. A checksum detects changed bytes; it is not a trusted code-signing identity. From the directory containing the extracted `notion-calendar-sync-0.2.3` folder:

```sh
cd notion-calendar-sync-0.2.3
cat /etc/os-release
dpkg --print-architecture
python3 --version
sudo sh scripts/install-pi.sh
sudoedit /etc/ncs/config.toml
sudoedit /etc/ncs/secrets.env
```

The installer creates the dedicated `ncs` account, installs code and a virtual environment, and leaves synchronization disabled. It preserves existing config/secrets on upgrades and refuses installation while the service runs.

| Path | Purpose | Owner/mode |
| --- | --- | --- |
| `/opt/ncs/app` | Source and deployment resources | root-owned |
| `/opt/ncs/venv` | Installed executable environment | root-owned |
| `/etc/ncs/config.toml` | Non-secret mapping and paths | root:ncs, 0640 |
| `/etc/ncs/secrets.env` | Notion/webhook secrets | root:root, 0600 |
| `/etc/ncs/google-client.json` | Downloaded Desktop client | root:ncs, 0640 |
| `/var/lib/ncs/google-token.json` | Automatically refreshed token | ncs:ncs, 0600 |
| `/var/lib/ncs/sync.sqlite3` | Identities, pending work and conflicts | ncs:ncs, 0600 |

The state directory is private to `ncs` with mode 0700. Here, modes such as 0600 describe Unix file permissions: only the owner may read/write a 0600 file.

## 6. Set exact configuration

Replace all placeholders and example property names in `/etc/ncs/config.toml`:

```toml
[service]
state_path = "/var/lib/ncs/sync.sqlite3"
google_token_path = "/var/lib/ncs/google-token.json"
google_client_path = "/etc/ncs/google-client.json"
notion_token_env = "NOTION_TOKEN"
log_level = "INFO"
public_url = ""

[[mappings]]
name = "calendar"
notion_data_source = "YOUR_DATA_SOURCE_UUID"
google_calendar = "YOUR_CALENDAR_ID"
timezone = "America/Denver"
poll_seconds = 45
reconcile_seconds = 900
notion_incremental = false
default_duration_minutes = 60
conflict_policy = "manual"
allow_attendees = false
# Optional exact Select filter, configured together:
# notion_select_property = "Type"
# notion_select_value = "Research"
# Optional created-time cutoff for unlinked history:
# import_since = "2026-11-09T00:00:00Z"

[mappings.properties]
title = "Name"
date = "Date"
google_event_id = "NCS Event ID"
description = "Notes"
location = "Location"
timezone = "NCS Time Zone"
google_url = "Calendar Link"
recurrence = "Recurrence"
# Enable only after creating and checking this Checkbox:
# sync_enabled = "Sync enabled"
```

Optional keys must be omitted when their properties do not exist. TOML has no null value. Relative paths in another installation resolve against the TOML file's directory. A default regional IANA zone such as `America/Denver` or `Europe/London` includes daylight-saving rules; EST-style abbreviations are not equivalent.

The optional category filter requires an existing Select property and exact option. Status and Multi-select are unsupported. A new Google import receives the configured category and participation Checkbox. Existing dated Notion pages still need their Checkbox checked when it is mapped. `import_since` is an offset-aware creation-time boundary for unlinked items, not an event-date filter or an identity matcher. Older items are reported for explicit review; linked items continue synchronizing.

For another pair, add a `[[mappings]]` block and its own `[mappings.properties]`. Mapping names and Google calendar IDs must be distinct. A shared Notion source requires disjoint option values of the same Select property. Do not put the same event or row under independent owners.

In `/etc/ncs/secrets.env`, place only shell-compatible assignments:

```sh
NOTION_TOKEN='YOUR_INTERNAL_CONNECTION_TOKEN'
NOTION_WEBHOOK_SECRET=''
```

`notion_token_env` names the environment variable used for the Notion token. The default is `NOTION_TOKEN`. `NOTION_WEBHOOK_SECRET` is unused by normal polling. Keep this file root-owned, mode 0600. Do not place real credentials in HTML, TOML, Git, screenshots or command arguments.

## 7. Authorize Google on a browser computer

Extract the same source release on a Mac or Linux computer with Python 3.11 or newer and a browser. From that source root:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install .
cp examples/config.toml authorize.toml
```

Edit `authorize.toml` before continuing. Set `google_client_path`, `google_token_path` and `state_path` to absolute local paths. Use a private local directory for the client/token/state. Put the downloaded Google client JSON at the local client path. Fill the mapping IDs and actual property names; this authorization command does not perform synchronization or need the Notion token. Then run:

```sh
.venv/bin/ncs --config authorize.toml authorize
```

Complete consent in the system browser on this same computer within five minutes while the command stays running. Choose the account with access to your intended calendar; the default browser may be signed into a different account from your Cloud Console browser. If the receiver times out, rerun authorization and use the new request. The command creates the configured local token file. `--no-browser` only stops automatic browser launching; it does not enable authorization on another machine or a deprecated copy-and-paste code flow. `--port N` can select a particular free local callback port; otherwise a free port is chosen.

For Windows source authorization, install the desktop extra so Python can use its bundled regional time-zone database. The corresponding PowerShell commands are:

```powershell
py -3 -m venv .venv
.venv\Scripts\python.exe -m pip install ".[desktop]"
Copy-Item examples\config.toml authorize.toml
# Edit authorize.toml with absolute LOCAL paths and your mapping.
.venv\Scripts\ncs.exe --config authorize.toml authorize
```

Transfer the resulting client and token securely to the Pi. Replace each placeholder with your own paths and SSH username/host. On macOS/Linux:

```sh
chmod 600 /LOCAL/PATH/google-token.json /LOCAL/PATH/google-client.json
scp /LOCAL/PATH/google-token.json PI_USER@PI_HOST:/tmp/ncs-google-token.json
scp /LOCAL/PATH/google-client.json PI_USER@PI_HOST:/tmp/ncs-google-client.json
```

On Windows, use your private Windows file paths with `scp`; protect those originals with your account's file permissions rather than Unix `chmod`. Then on the Pi:

```sh
sudo install -o ncs -g ncs -m 0600 /tmp/ncs-google-token.json /var/lib/ncs/google-token.json
sudo install -o root -g ncs -m 0640 /tmp/ncs-google-client.json /etc/ncs/google-client.json
rm /tmp/ncs-google-token.json /tmp/ncs-google-client.json
sudo ncs-control inspect
sudo ncs-control dry-run
```

Remove temporary workstation credentials when no longer needed or retain them only in protected storage. The running service refreshes tokens automatically and atomically. On `invalid_grant` or revocation, stop the worker, repeat authorization, replace the token and restart. Retain SQLite state so stable identities survive reconnection.

## 8. Review the initial import and link existing copies

`inspect` validates schema and calendar access. `dry-run` reads providers and previews actions without provider writes. Read proposed creates, updates, links, conflicts and unsupported items. Notion pages and Google events with no shared stable identity import independently; identical titles/dates are never enough to merge them.

For an existing third-party pair, verify its exact Notion page UUID and Google event `id` in the selected calendar. Google's `iCalUID` and user-facing event URL are not that API ID. The [events.list API Explorer](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) can retrieve the event's `id`. With other writers stopped:

```sh
sudo systemctl stop ncs
sudo ncs-control link --mapping calendar --notion NOTION_PAGE_UUID --google GOOGLE_EVENT_ID
sudo ncs-control link --mapping calendar --notion NOTION_PAGE_UUID --google GOOGLE_EVENT_ID --apply
sudo ncs-control dry-run
```

The first `link` previews; `--apply` authorizes writing the relationship. The mapping name must match configuration. Differing values can become conflicts. Repeat only for verified identities. A displayed URL alone is not used automatically to establish a pair. Do not delete state to force a fresh import.

## 9. Start and observe synchronization

After reviewing the dry run and removing unwanted creates:

```sh
sudo ncs-control sync
sudo systemctl enable --now ncs
sudo systemctl status ncs
sudo ncs-control status
sudo journalctl --namespace=ncs -u ncs -f
```

`sync` is one applying cycle. `enable --now` starts continuous synchronization and enables boot startup. Neither has the desktop confirmation dialog. These commands authorize remote changes. `ncs-control` loads the protected environment and runs the CLI as the dedicated `ncs` account. For a custom installation, the equivalent is `ncs --config /PATH/config.toml COMMAND` with its environment supplied securely.

Routine controls:

```sh
sudo systemctl stop ncs
sudo systemctl start ncs
sudo systemctl restart ncs
sudo systemctl is-enabled ncs
sudo ncs-control status
sudo ncs-control operations
sudo ncs-control conflicts
```

Stop the daemon before manual write commands, dry runs, authorization, linking or resolutions against its state. Read-only status/conflict inspection and consistent SQLite backup can run online. A process lock prevents simultaneous local writers; it does not coordinate independent computers or third-party services.

Default checks are every 45 seconds with a full reconciliation every 900 seconds. Polling must be at least five seconds; reconciliation cannot be shorter than polling. Google normally retrieves incremental changes. Expired Google sync tokens cause a full fetch while preserving mappings. Default Notion scans cover full active/archived membership; missing linked pages receive a confirming GET before any deletion decision. `notion_incremental=true` uses edited-time overlap and can reduce transferred scan data, but Trash detection can wait until reconciliation or a verified notification. Keep the default for prompt deletion checks.

For a light mapping fitting each listing page, unchanged 45-second polling normally uses about 5,760 Notion and 3,840 Google requests/day before writes, retries and extra pages. Compression, pagination, incremental Google requests and bounded retries are implemented. This is not a guaranteed five-second end-to-end SLA. Detection, provider timing, throttling and outages affect completion. Check current [Notion limits](https://developers.notion.com/reference/request-limits) and [Google quotas](https://developers.google.com/workspace/calendar/api/guides/quota) before large imports.

## 10. Test disposable items

On a dedicated test pair, verify all of these before using working data:

1. Create one ordinary timed Notion entry; check participation when configured. Confirm one Google event, a filled event-ID marker and its link.
2. Edit Google title/time/location and Notion notes in turn. Confirm the same counterpart IDs change.
3. Create another attendee-free Google event. Confirm one Notion entry. Test a multi-day all-day conversion and a regional time-zone change.
4. Repeat checks through a full reconciliation and restart. Confirm no extra creates and inspect pending operations.
5. Trash the first Notion page and verify Google cancellation. Delete the second Google event and verify Notion Trash.
6. For a conflict, pause the worker, edit the same mapped field differently on both sides, then resume. Verify the retained conflict and choose a provider deliberately.

These are account-specific live checks. Website verification and controlled automated tests do not establish that your credentials, permissions or network work.

## 11. Understand supported behavior

Title and the atomic time range synchronize both ways, with optional description, location and recurrence. Only changed mapped fields are patched. Notion page content and unrelated properties remain untouched. Mapped rich-text values are literal source text; changing their text can replace internal annotations and mentions. HTML in a Google description stays literal in Notion Text rather than repeatedly converting formats. Partial/paginated rich content is held instead of silently truncated.

Notion all-day end dates are inclusive; Google ends are exclusive. A Notion October 30 to October 31 range becomes Google start October 30/end November 1. Missing timed ends default to the configured duration; missing all-day ends mean one day. Undated new entries do not create events. Clearing a date or disabling participation suspends a linked pair and preserves its existing peer.

A mapped time-zone Text property preserves the IANA region while Notion endpoints store UTC, avoiding provider coercion at daylight-saving transitions. The Date display can show UTC. Invalid, nonexistent, mixed date/timestamp or offset-ambiguous ranges are reported rather than silently shifted. Start/end/zone/all-day/recurrence form one conflict group.

SQLite retains both identities, synchronized baselines, pending operations and conflicts. Own writes converge without feedback loops; uncertain writes can remain blocked rather than risking duplicate creation. Independent mapped-field edits merge. Competing edits become persistent manual conflicts while other items continue:

```sh
sudo ncs-control conflicts CONFLICT_ID
sudo systemctl stop ncs
sudo ncs-control resolve CONFLICT_ID --prefer notion
# Or --prefer google after reviewing both versions.
sudo systemctl start ncs
```

The alternative `conflict_policy="notion"` or `"google"` explicitly discards conflicting values from the other side. Manual is the default.

Positive Notion Trash or Google cancellation evidence propagates to the linked, supported, in-scope peer. A retained tombstone prevents accidental recreation. A deletion concurrent with an edit becomes a conflict. Provider retention limits still apply. Permission errors, missing queries, incomplete pagination, cleared dates, category changes and data-source archival do not establish deletion. Restoring only one side does not resurrect the pair. Restore both deliberately and explicitly relink the same live IDs to reactivate.

Recurrence requires the optional Text mapping, with newline-separated `RRULE:`, `RDATE:` and `EXDATE:` source. For example: `RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=8`. DTSTART/DTEND belong in Date. One page represents a master, and explicitly modified Google occurrences can have exact-instance pages. Ordinary occurrences are not expanded indefinitely. A linked exception's edit or deletion affects that occurrence, not the entire series. Unlinked Notion-created exceptions are unsupported. Google's “this and following” operation may split masters into distinct identities. Unsupported recurrence is preserved and reported.

By default attendee events are excluded from writes and deletions, including linked events that later gain attendees. RSVP, invitations, conference creation, special event types and locked events are outside this setup. Leave `allow_attendees=false`; Google's `sendUpdates=none` is not an absolute no-email guarantee. Unmapped Google metadata is omitted from patches, but Google can normalize inherited reminders into explicit alarms during timed-to-all-day conversion. Current alarms may remain equivalent while ceasing to follow future calendar-default changes.

## 12. Optional public HTTPS notifications

Polling is complete and independently usable. Only enable webhooks if you already operate a stable public HTTPS endpoint with a trusted TLS certificate. A webhook is an incoming notification. Here it is only a signal to fetch current state, never authority to edit from its payload.

Forward POST requests for `/webhooks/notion` and `/webhooks/google` from your HTTPS reverse proxy to `127.0.0.1:8765` on the Pi. Limit bodies to 256 KiB. Do not expose the plain HTTP receiver directly. Add these actual service settings:

```toml
# Under the existing [service] section, not a second [service] block:
public_url = "https://YOUR_EXISTING_HOST"
webhook_host = "127.0.0.1"
webhook_port = 8765
notion_webhook_secret_env = "NOTION_WEBHOOK_SECRET"
notion_webhook_subscription = "YOUR_SUBSCRIPTION_ID"
notion_webhook_workspace = "YOUR_WORKSPACE_ID"
```

Prepare a Notion connection subscription for `https://YOUR_EXISTING_HOST/webhooks/notion` in its Webhooks tab. Select page creation/property/content updates, moves, deletion/restore and relevant data-source/schema events. Before sending/resending its verification handshake, stop the normal service and start the explicit bootstrap receiver:

```sh
sudo systemctl stop ncs
sudo ncs-control webhook-verify --output /var/lib/ncs/notion-candidate.txt --timeout 300
```

The newly created mode-0600 candidate file contains an untrusted token. Read it privately and submit its value in Notion's Verify form. Only after Notion accepts it, put that same value in `NOTION_WEBHOOK_SECRET` in the protected environment file. Set the actual subscription/workspace IDs from your Notion subscription information or verified provider delivery; do not guess them. Delete the candidate file and restart the worker.

Notion notifications require a valid HMAC signature. Configured subscription/workspace IDs are checked. Google watch channels are automatically created and renewed when `public_url` is set; the receiver validates the stored token, resource ID and expiration. Duplicate messages are deduplicated before acknowledgement. Polling and periodic reconciliation continue if delivery or renewal fails. Hosting, DNS, TLS and proxy provisioning are operator-specific and are not automated by this package.

Official references: [Notion subscription and verification](https://developers.notion.com/reference/webhooks), [events/delivery](https://developers.notion.com/reference/webhooks-events-delivery), [Google push channels](https://developers.google.com/workspace/calendar/api/guides/push).

## 13. Backups, restore, upgrades and removal

Create a consistent SQLite backup with a new output filename, and protect config/client/token copies separately:

```sh
sudo ncs-control backup /var/lib/ncs/backup-UNIQUE_DATE.sqlite3
sudo tar -czf /var/lib/ncs/private-config-UNIQUE_DATE.tar.gz -C /etc ncs
sudo chmod 600 /var/lib/ncs/private-config-UNIQUE_DATE.tar.gz
```

Also include `/var/lib/ncs/google-token.json` in a protected credential backup. Transfer backups to protected off-device storage using your own backup system. Dated backups are not automatically pruned. State, conflict content and credentials are private. Never upload them to a public repository.

To restore, stop `ncs` and retain the current database plus any WAL/SHM companions first. Restore a consistent state/configuration set and its credentials with the documented owners/modes. Remove stale WAL/SHM files only while stopped and after retaining the current set. Do not overwrite a newly authorized token unnecessarily. Run `inspect`, `dry-run --full`, then an explicitly reviewed `sync --full` before restarting. Restoring older state cannot undo provider changes made since that backup.

For upgrades: stop, back up, retain the old source package, extract the new release separately, run its tests, rerun `sudo sh scripts/install-pi.sh`, inspect and preview. Then apply a reviewed full synchronization and restart. Do not run two versions against one SQLite database. A future state-schema migration must be handled using that release's migration instructions.

Run source tests from the extracted root without provider credentials:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

`/var/lib/ncs/ncs.log` rotates at 2 MiB per file with up to three backups, approximately 8 MiB total. The dedicated journald namespace is bounded to 50 MB persistent/10 MB runtime and 14 days; active journal files can temporarily exceed limits. Inspect with `sudo journalctl --namespace=ncs -u ncs --since '1 hour ago'`. Full conflict/operation details contain private event values and belong only in private terminals/files.

Uninstall code while preserving user data:

```sh
sudo systemctl disable --now ncs
sudo rm -f /etc/systemd/system/ncs.service /usr/local/bin/ncs-control
sudo systemctl daemon-reload
sudo rm -rf /opt/ncs
```

These commands retain `/etc/ncs`, `/var/lib/ncs`, the service account and provider records. Revoke provider access separately if disconnecting permanently. Delete retained credentials/state only as a separate deliberate operation after keeping required recovery records.

## 14. Troubleshooting

| Symptom | Check and recovery |
| --- | --- |
| Notion 401 | Correct or replace the internal token; retain SQLite. |
| Database absent / 404 | Grant database access, check workspace and data source ID. Missing access does not mean deletion. |
| Schema validation error | Correct exact property names/types; omit unwanted optional mappings. |
| Google authorization denied | Check the enabled Calendar API, Desktop client JSON, test users, scopes and organization policy. |
| Redirect mismatch | Use a Desktop client and browser on the same machine as the callback receiver. |
| `invalid_grant` / stops after seven days | Check Testing status and reauthorize; retain state. |
| No event imported | Check dates, Checkbox/category, attendees, recurrence and unsupported diagnostics; verify worker/network. |
| Date cleared but event remains | Expected suspension; explicit Trash/cancellation is the deletion operation. |
| 429/529/quota errors | Preserve queued work and allow backoff. Check provider quotas/capacity and workload. |
| Busy lock | Stop the existing worker before write or preview commands. |
| Unexpected duplicate-import preview | Stop independent writers and review stable identities. Do not merge by title/date or erase state. |
| Uncertain Notion create | Inspect `operations` and `operations OPERATION_ID` privately. Search active pages and Trash for the exact event marker. Only after positively confirming no remote page exists use `retry-operation OPERATION_ID --acknowledge-no-remote-create`. |
| Webhook 401/403 | Verify TLS forwarding, protected token, signature, channel resource and configured subscription/workspace IDs. Polling continues. |

This server guide is documentation for the released implementation. It does not itself authorize, deploy or smoke-test your accounts. See the website's release validation report for the platforms and provider checks actually executed.

## Provider-changed save results

Release 0.2.3 retains requested and returned mapped values when an API save changes them. The exact item IDs and completed operation are persisted together with an open manual conflict. Automatic conflict policies cannot override this hold. A lost response followed by different current values is also held for review because provider normalization and concurrent edits cannot be safely distinguished. Never clear SQLite state to bypass a hold.

A live Google API probe changed an America/Denver 90-minute range spanning the two copies of the autumn repeated hour into 30 minutes, even when the named-zone request used UTC timestamps. The original Notion range is now retained and the provider result is exposed separately. Explicitly choosing a UTC event zone preserved the tested one-off interval. Do not silently convert a recurring series to UTC, since that could change its future daylight-saving behavior. Review both versions and make any time-zone choice deliberately. When a provider item changed after the conflict was recorded, inspect the refreshed conflict before resolving again.
