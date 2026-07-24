"""
SQLAlchemy model for authenticated users.

google_sub (Google's stable 'sub' claim) is the primary lookup key.
Email is stored for display only — it can theoretically change on
Google's side, so always look users up by google_sub first.

password_hash is nullable and unused in v1 — reserved if email/password
sign-in is added later without a schema migration.
"""

from datetime import datetime

from .. import db


class User(db.Model):
    __tablename__ = "users"

    id                  = db.Column(db.Integer, primary_key=True)
    google_sub          = db.Column(db.String(255), unique=True, nullable=False, index=True)
    email               = db.Column(db.String(255), unique=True, nullable=False)
    name                = db.Column(db.String(255), nullable=False)
    profile_picture_url = db.Column(db.String(512), nullable=True)
    # Unused in v1 — placeholder for a future email/password option.
    password_hash       = db.Column(db.String(255), nullable=True)
    created_at          = db.Column(db.DateTime, default=datetime.utcnow)
    last_login_at       = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id":      self.id,
            "name":    self.name,
            "email":   self.email,
            "picture": self.profile_picture_url,
        }

    def __repr__(self) -> str:
        return f"<User {self.email}>"
