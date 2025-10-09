-- Add field_positions column to document_templates
-- Run with: wrangler d1 execute hartzell_hr --remote --file=./migrations/004_add_field_positions.sql

ALTER TABLE document_templates ADD COLUMN field_positions TEXT;
