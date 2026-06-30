-- Phase 14: private push delivery target for the pilot.
alter table central_device_snapshots
  add column if not exists expo_push_token text;

create index if not exists central_device_snapshots_store_push_idx
  on central_device_snapshots (store_id, updated_at desc)
  where expo_push_token is not null;

comment on column central_device_snapshots.expo_push_token is
  'Private Expo push token used only by Worker push dispatch; never projected to Command Center or public readiness records.';
