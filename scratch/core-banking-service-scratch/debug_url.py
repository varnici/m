import sys
import os
sys.path.append('.')
from app.core.config import sqlalchemy_url
print(sqlalchemy_url())
