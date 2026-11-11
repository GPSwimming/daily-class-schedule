import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const source = JSON.parse(await readFile(new URL("private/reference-catalog.json", root), "utf8"));
const courses = source.referenceCourses;
const locations = source.referenceLocations;
if (!Array.isArray(courses) || !Array.isArray(locations) || courses.length !== 52 || locations.length !== 17) {
  throw new Error("Expected 52 course rows and 17 location rows; stopped before writing SQL.");
}
const catalog = JSON.stringify({ courses, locations }).replaceAll("'", "''");
const sql = `-- Run in the intended Supabase project's SQL Editor only after checking the project.
-- This inserts reference courses and locations; it never uploads browser students.
begin;
insert into public.swim_app_data (singleton) values (true) on conflict (singleton) do nothing;
update public.swim_app_data
set suite = suite || jsonb_build_object('catalog', '${catalog}'::jsonb),
    revision = revision + 1,
    updated_at = now()
where singleton = true;
commit;
select jsonb_array_length(suite->'catalog'->'courses') as course_count,
       jsonb_array_length(suite->'catalog'->'locations') as location_count,
       jsonb_array_length(students) as uploaded_students
from public.swim_app_data where singleton = true;
`;
await writeFile(new URL("private/catalog-seed.sql", root), sql, "utf8");
console.log(`Prepared private SQL for ${courses.length} courses and ${locations.length} locations; no student rows.`);
