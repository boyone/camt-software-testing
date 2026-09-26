--liquibase formatted sql

--changeset election:005-add-district-closed-at
-- NULL = the district's poll is still open.
ALTER TABLE districts ADD COLUMN closed_at TIMESTAMPTZ;
--rollback ALTER TABLE districts DROP COLUMN closed_at;
