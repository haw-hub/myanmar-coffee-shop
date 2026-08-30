-- Remove duplicate items created by re-running the original seed script.
-- Keep the earliest row for each category/name pair, then prevent recurrence.
delete from public.items
where id in (
  select id from (
    select id, row_number() over (
      partition by category_id, name_en
      order by created_at asc, id asc
    ) as row_number
    from public.items
  ) ranked
  where row_number > 1
);

create unique index if not exists idx_items_category_name_en_unique
  on public.items(category_id, name_en);
