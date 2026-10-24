"""
Settings for the live end-to-end run: the project's own settings with one change, mail is written to files so the
test can read the real emails the backend sends. Nothing else differs. Not used by anything outside e2e-live.
"""
import os

from config.settings import *  # noqa: F401,F403

EMAIL_BACKEND = 'django.core.mail.backends.filebased.EmailBackend'
EMAIL_FILE_PATH = os.environ['LIVE_E2E_MAIL_DIR']
