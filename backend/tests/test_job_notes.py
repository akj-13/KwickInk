import unittest

from app.routers.jobs import SettingsIn


class JobNotesSettingsTests(unittest.TestCase):
    def test_settings_accepts_special_instructions(self):
        settings = SettingsIn.model_validate({"notes": "Fold along the center and use premium paper."})
        self.assertEqual(settings.notes, "Fold along the center and use premium paper.")


if __name__ == "__main__":
    unittest.main()
