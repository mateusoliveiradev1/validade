-- Allow real hortifruti quantities such as 1.5 kg to sync centrally.
ALTER TABLE central_lots
  ALTER COLUMN approximate_quantity TYPE double precision
  USING approximate_quantity::double precision;
