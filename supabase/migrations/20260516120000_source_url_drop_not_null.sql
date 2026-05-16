-- source_url has a CHECK constraint requiring a valid https?:// URL when non-null.
-- The NOT NULL constraint prevented inserting editorial rows that have no source URL
-- (e.g. Notion-originated content where the Source URL field is blank).
-- Dropping NOT NULL lets the column be NULL for those rows; the CHECK still
-- enforces format for any non-null value. source_name retains NOT NULL + default ''.
ALTER TABLE signal_posts ALTER COLUMN source_url DROP NOT NULL;
