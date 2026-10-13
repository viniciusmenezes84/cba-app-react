-- Public read supports profile photos and exportable cards. There are deliberately
-- no anon/authenticated write policies: the custom-session Edge Function owns writes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;
