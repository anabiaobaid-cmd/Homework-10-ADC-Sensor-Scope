# +--------------------------------------------------------------------------+
# | PythonAnywhere WSGI Configuration File                                   |
# +--------------------------------------------------------------------------+
#
# This file is for PythonAnywhere hosting.
# Replace 'yourusername' with your actual PythonAnywhere username if needed.

import sys
import os

# Path to your project directory on PythonAnywhere
path = os.path.expanduser('~/Homework_9')
if path not in sys.path:
    sys.path.insert(0, path)

# Import the Flask application object
from app import app as application  # noqa
