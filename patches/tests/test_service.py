import json
import os
from pathlib import Path
import tempfile
import unittest

from notion_calendar_sync.config import Config, Mapping
from notion_calendar_sync.service import StateLock, SyncService, report_has_errors, PrivateRotatingFileHandler
from notion_calendar_sync.store import Store


class Clock:
    def __init__(self):
        self.value = 100000.0

    def __call__(self):
        return self.value


class FakeEngine:
    def __init__(self):
        self.calls = []
        self.results = []
        self.callback = None

    def sync(self, **kwargs):
        self.calls.append(kwargs)
        if self.callback:
            self.callback()
        result = self.results.pop(0) if self.results else []
        if isinstance(result, Exception):
            raise result
        return result


class FakeGoogle:
    def __init__(self, clock):
        self.clock = clock
        self.calls = []
        self.stopped = []
        self.fail = False

    def watch(self, mapping, channel_id, token, address):
        self.calls.append((mapping.name, channel_id, token, address))
        if self.fail:
            raise OSError("offline")
        return {"id": channel_id, "resourceId": "resource-" + channel_id, "expiration": str(int((self.clock() + 86400) * 1000))}

    def stop_channel(self, channel_id, resource_id):
        self.stopped.append((channel_id, resource_id))


class ServiceTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        mapping = Mapping("work", "source", "calendar")
        self.config = Config(state_path=Path(self.directory.name) / "state.sqlite3", mappings=[mapping])
        self.store = Store(self.config.state_path)
        self.addCleanup(self.store.close)
        self.clock = Clock()
        self.engine = FakeEngine()
        self.google = FakeGoogle(self.clock)
        self.service = SyncService(self.config, self.store, self.engine, self.google, now=self.clock, monotonic=self.clock)

    def signal(self, id="notification", mapping="work"):
        self.store.db.execute("INSERT INTO signals VALUES (?,?,?,?,?)", (id, "google", mapping, "", self.clock()))
        self.store.db.commit()

    def test_bootstrap_full_then_incremental_poll_and_notification(self):
        self.service.tick()
        self.assertEqual([{"full": True, "mapping_names": ["work"]}], self.engine.calls)
        self.clock.value += 1
        self.service.tick()
        self.assertEqual(1, len(self.engine.calls))
        self.signal()
        self.service.tick()
        self.assertEqual({"full": False, "mapping_names": ["work"]}, self.engine.calls[-1])
        self.assertEqual(0, self.store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0])
        self.clock.value += 46
        self.service.tick()
        self.assertEqual(3, len(self.engine.calls))
        metrics = json.loads(self.store.db.execute("SELECT value FROM meta WHERE key='last_service_metrics'").fetchone()[0])
        self.assertTrue(metrics["success"])
        self.assertIn("duration_seconds", metrics)

    def test_failure_keeps_pending_work_and_returns_after_connectivity(self):
        self.signal()
        self.engine.results = [OSError("offline"), []]
        self.service.tick()
        self.assertEqual(1, self.store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0])
        self.clock.value += 16
        self.service.tick()
        self.assertEqual(0, self.store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0])
        self.assertEqual(2, len(self.engine.calls))

    def test_arrivals_during_sync_remain_pending(self):
        self.signal("first")
        self.engine.callback = lambda: self.signal("during")
        self.service.tick()
        rows = self.store.db.execute("SELECT id FROM signals").fetchall()
        self.assertEqual(["during"], [row[0] for row in rows])

    def test_global_signal_only_acknowledged_after_all_mappings(self):
        self.config.mappings.append(Mapping("home", "source2", "calendar2"))
        self.service = SyncService(self.config, self.store, self.engine, self.google, now=self.clock, monotonic=self.clock)
        self.service.next_reconcile["home"] = self.clock() + 100
        self.signal(mapping="")
        self.engine.results = [[], [{"action": "error", "error": "offline"}]]
        self.service.tick()
        self.assertEqual(2, len(self.engine.calls))
        self.assertEqual(1, self.store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0])
        self.clock.value += 16
        self.service.tick()
        self.assertEqual(0, self.store.db.execute("SELECT COUNT(*) FROM signals").fetchone()[0])

    def test_channel_creation_renewal_and_durable_replacement(self):
        self.config.public_url = "https://calendar.example.test"
        self.service.renew_channels()
        first = self.store.db.execute("SELECT * FROM channels").fetchone()
        self.assertEqual("active", first["status"])
        self.service.renew_channels()
        self.assertEqual(1, len(self.google.calls))
        self.store.db.execute("UPDATE channels SET expiration=?", (self.clock() + 3500,))
        self.store.db.commit()
        self.service.renew_channels()
        self.assertEqual(2, len(self.google.calls))
        self.assertEqual([(first["id"], first["resource_id"])], self.google.stopped)
        self.assertEqual(1, self.store.db.execute("SELECT COUNT(*) FROM channels WHERE status='active'").fetchone()[0])

    def test_renewal_failure_retains_previous_channel_and_polling(self):
        self.config.public_url = "https://calendar.example.test"
        self.service.renew_channels()
        self.store.db.execute("UPDATE channels SET expiration=?", (self.clock() + 3500,))
        self.store.db.commit()
        self.google.fail = True
        self.service.tick()
        self.assertEqual(1, self.store.db.execute("SELECT COUNT(*) FROM channels WHERE status='active'").fetchone()[0])
        self.assertEqual(1, len(self.engine.calls))
        self.assertEqual([], self.google.stopped)

    def test_writer_lock_prevents_multiple_process_writers(self):
        with StateLock(self.config.state_path):
            with self.assertRaises(RuntimeError):
                with StateLock(self.config.state_path):
                    pass
        with StateLock(self.config.state_path):
            pass

    def test_rotated_logs_keep_private_permissions(self):
        import logging
        log_path = Path(self.directory.name) / "rotating.log"
        handler = PrivateRotatingFileHandler(log_path, maxBytes=8, backupCount=1)
        try:
            for _ in range(3):
                handler.emit(logging.LogRecord("test", logging.INFO, __file__, 1, "a message long enough to rotate", (), None))
            self.assertTrue(log_path.is_file())
            self.assertTrue(Path(str(log_path) + ".1").is_file())
            if os.name != 'nt':  # Windows uses per-user ACLs, not POSIX mode bits.
                self.assertEqual(0o600, log_path.stat().st_mode & 0o777)
                self.assertEqual(0o600, Path(str(log_path) + ".1").stat().st_mode & 0o777)
        finally:
            handler.close()

    def test_error_result_detection(self):
        self.assertTrue(report_has_errors([{"action": "error"}]))
        self.assertFalse(report_has_errors([{"action": "conflict"}]))


if __name__ == "__main__":
    unittest.main()
