from datetime import datetime, timezone
import hashlib
import hmac
from http.client import HTTPConnection
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from notion_calendar_sync.config import Config
from notion_calendar_sync.store import Store
from notion_calendar_sync.webhooks import WebhookReceiver, start_server, MAX_BODY


class WebhookTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.config = Config(state_path=Path(self.directory.name) / "state.sqlite3", webhook_port=0)
        self.clock = 1793350000.0
        self.receiver = WebhookReceiver(self.config, now=lambda: self.clock)
        self.secret = patch.dict(os.environ, {"NOTION_WEBHOOK_SECRET": "test-verification-secret"})
        self.secret.start()
        self.addCleanup(self.secret.stop)
        with Store(self.config.state_path):
            pass

    def notion(self, event_id="event-1", **changes):
        payload = {"id": event_id, "timestamp": datetime.fromtimestamp(self.clock, timezone.utc).isoformat(), "entity": {"id": "page-1"}, "type": "page.properties_updated"}
        payload.update(changes)
        raw = json.dumps(payload).encode()
        signature = "sha256=" + hmac.new(b"test-verification-secret", raw, hashlib.sha256).hexdigest()
        return raw, {"X-Notion-Signature": signature}

    def signal_count(self):
        with Store(self.config.state_path) as store:
            return store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0]

    def test_notion_raw_signature_and_duplicate_receipt_after_consumption(self):
        raw, headers = self.notion()
        self.assertEqual(204, self.receiver.accept("/webhooks/notion", headers, raw))
        self.assertEqual(1, self.signal_count())
        with Store(self.config.state_path) as store:
            store.db.execute("DELETE FROM signals")
            store.db.commit()
        self.assertEqual(204, self.receiver.accept("/webhooks/notion", headers, raw))
        self.assertEqual(0, self.signal_count())
        self.assertEqual(403, self.receiver.accept("/webhooks/notion", headers, raw + b" "))

    def test_reject_unsigned_stale_future_and_wrong_subscription(self):
        raw, headers = self.notion()
        self.assertEqual(403, self.receiver.accept("/webhooks/notion", {}, raw))
        for offset in [-8 * 86400, 301]:
            raw, headers = self.notion(timestamp=datetime.fromtimestamp(self.clock + offset, timezone.utc).isoformat())
            self.assertEqual(400, self.receiver.accept("/webhooks/notion", headers, raw))
        self.config.notion_webhook_subscription = "expected"
        raw, headers = self.notion(subscription_id="other")
        self.assertEqual(403, self.receiver.accept("/webhooks/notion", headers, raw))
        self.assertEqual(0, self.signal_count())

    def test_delayed_and_out_of_order_notifications_are_signals(self):
        raw, headers = self.notion("late", timestamp=datetime.fromtimestamp(self.clock - 86400, timezone.utc).isoformat())
        self.assertEqual(204, self.receiver.accept("/webhooks/notion", headers, raw))
        raw, headers = self.notion("earlier", timestamp=datetime.fromtimestamp(self.clock - 2 * 86400, timezone.utc).isoformat())
        self.assertEqual(204, self.receiver.accept("/webhooks/notion", headers, raw))
        self.assertEqual(2, self.signal_count())

    def test_bootstrap_is_explicit_one_shot_untrusted_and_private(self):
        raw = b'{"verification_token":"candidate"}'
        self.assertEqual(403, self.receiver.accept("/webhooks/notion", {}, raw))
        output = Path(self.directory.name) / "candidate"
        receiver = WebhookReceiver(self.config, bootstrap_output=output)
        self.assertEqual(204, receiver.accept("/webhooks/notion", {}, raw))
        self.assertEqual("candidate\n", output.read_text())
        if os.name != 'nt':  # Windows secrets stay in its native vault; mode bits are POSIX-only.
            self.assertEqual(0o600, output.stat().st_mode & 0o777)
        self.assertTrue(receiver.verified.is_set())
        self.assertEqual(409, receiver.accept("/webhooks/notion", {}, raw))
        self.assertEqual("test-verification-secret", os.environ["NOTION_WEBHOOK_SECRET"])
        self.assertEqual(0, self.signal_count())

    def google_headers(self, **changes):
        headers = {"X-Goog-Channel-Id": "channel", "X-Goog-Channel-Token": "channel-token", "X-Goog-Resource-Id": "resource", "X-Goog-Resource-State": "exists", "X-Goog-Message-Number": "10"}
        headers.update(changes)
        return headers

    def channel(self, status="active", resource="resource", expiration=None):
        with Store(self.config.state_path) as store:
            store.db.execute("INSERT OR REPLACE INTO channels VALUES (?,?,?,?,?,?)", ("channel", "work", resource, "channel-token", expiration or self.clock + 3600, status))
            store.db.commit()

    def test_google_channel_binding_and_persistent_dedupe(self):
        self.channel()
        headers = self.google_headers()
        self.assertEqual(204, self.receiver.accept("/webhooks/google", headers, b""))
        self.assertEqual(204, self.receiver.accept("/webhooks/google", headers, b""))
        self.assertEqual(1, self.signal_count())
        self.assertEqual(403, self.receiver.accept("/webhooks/google", self.google_headers(**{"X-Goog-Channel-Token": "wrong"}), b""))
        self.assertEqual(403, self.receiver.accept("/webhooks/google", self.google_headers(**{"X-Goog-Resource-Id": "wrong"}), b""))
        self.channel(expiration=self.clock - 1)
        self.assertEqual(403, self.receiver.accept("/webhooks/google", headers, b""))

    def test_pending_sync_race_does_not_trust_resource(self):
        self.channel(status="pending", resource="")
        headers = self.google_headers(**{"X-Goog-Resource-State": "sync", "X-Goog-Message-Number": "1"})
        self.assertEqual(204, self.receiver.accept("/webhooks/google", headers, b""))
        self.assertEqual(0, self.signal_count())
        self.assertEqual(503, self.receiver.accept("/webhooks/google", self.google_headers(), b""))
        with Store(self.config.state_path) as store:
            self.assertEqual("", store.db.execute("SELECT resource_id FROM channels").fetchone()[0])

    def test_http_receiver_limits_and_acks_after_persistence(self):
        server, _ = start_server(self.config)
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        conn = HTTPConnection("127.0.0.1", server.server_port, timeout=5)
        self.addCleanup(conn.close)
        conn.request("POST", "/webhooks/notion", b"x", {"Content-Length": str(MAX_BODY + 1)})
        self.assertEqual(413, conn.getresponse().status)
        raw, headers = self.notion(timestamp=datetime.now(timezone.utc).isoformat())
        conn.request("POST", "/webhooks/notion", raw, headers)
        self.assertEqual(204, conn.getresponse().status)
        self.assertEqual(1, self.signal_count())


if __name__ == "__main__":
    unittest.main()
