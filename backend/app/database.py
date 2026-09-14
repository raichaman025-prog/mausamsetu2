"""
Database connection setup.

Uses SQLite for the prototype (zero-config, file-based).
To move to PostgreSQL + PostGIS in production, change DATABASE_URL to a
postgres:// DSN and swap Float lat/lng columns for a `geometry(Point, 4326)`
column via GeoAlchemy2 — the rest of the ORM layer stays the same.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mausamsetu.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
