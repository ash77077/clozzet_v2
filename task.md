# Prompt: Import Toma_optimized.xlsx into Clozzet CRM

Copy everything below the line and paste it into Claude Code when you're inside the `clozzet_v2` project folder.

---

## PROMPT START

I need you to build an import script for my CRM that reads `Toma_optimized.xlsx` and creates/updates records in my database. Here's exactly what's in the file and how to handle it.

### File location
`Toma_optimized.xlsx` — single sheet called "Toma", 380 rows, 11 columns.

### Column mapping

| Excel Column | Type | Description |
|---|---|---|
| `Company Name` | string | Company name (220 unique companies out of 380 rows) |
| `Industry` | string | Industry/sector (mix of English and Armenian, e.g. "IT", "Hotel", "դպրոdelays") |
| `Contact Person` | string, nullable | Person's name (sometimes missing) |
| `Position` | string, nullable | Job title (mix of EN/AM: "CEO", "HR", "տնօrendsեdelays" etc.) |
| `Phone` | string, nullable | Phone number — various formats: plain digits like `99533353`, prefixed like `tel:+37441508030`, or `whatsapp:37498057674` |
| `Email` | string, nullable | Email address (mostly null, only ~5 have values) |
| `Linkedin` | string, nullable | LinkedIn URL or path |
| `Notes` | string | The interaction note (Armenian text, 2–411 chars) |
| `First Contact date` | datetime | The date THIS specific interaction happened |
| `Next Follow Up` | datetime, nullable | Scheduled next follow-up date |
| `Scheduled meeting` | datetime, nullable | Confirmed meeting date (only 4 rows have this) |

### CRITICAL: How the data is structured

**The same company+contact appears as MULTIPLE ROWS — one row per interaction.** This is NOT a flat contact list. It's a chronological activity log where each row is a separate touchpoint.

Example — "Dodo pizza" has 8 rows:
- Row 1 (2026-02-24): First outreach — spoke with Hayk, he has a partner, offered to send presentation
- Row 2 (2026-03-17): He asked for apron pricing, will send photos
- Row 3 (2026-03-24): He sent photos, need to quote prices
- Row 4 (2026-03-27): Gave quotes, scheduled in-person meeting for March 31
- Row 5 (2026-03-31): Meeting happened, gave prices
- Row 6 (2026-04-02): Called, he forwarded info to decision-makers
- Row 7 (2026-04-07): Follow up
- Row 8 (2026-04-08): He placed a trial order!

### How to import — the transformation logic

**Step 1: Group rows by (`Company Name` + `Contact Person`)** to identify unique leads/contacts.

**Step 2: For each group, sort by `First Contact date` ascending.**

**Step 3: The FIRST row in each group becomes the LEAD/CONTACT record:**
- `company_name` = Company Name
- `industry` = Industry
- `contact_person` = Contact Person
- `position` = Position
- `phone` = Phone (normalize: strip `tel:` and `whatsapp:` prefixes, keep raw digits)
- `email` = Email
- `linkedin` = Linkedin
- `first_contact_date` = the `First Contact date` from this first row
- `first_note` = the `Notes` from this first row (this is the initial outreach note)
- `source` = "Toma spreadsheet import"

**Step 4: ALL SUBSEQUENT rows (2nd, 3rd, etc.) in that group become INTERACTION HISTORY records**, each linked to the lead/contact:
- `interaction_type` = "call" (default; or "linkedin_message" if the note contains "linkedin" or "լinqu" or "նamak")
- `interaction_date` = the `First Contact date` from that row
- `notes` = the `Notes` from that row
- `next_follow_up` = the `Next Follow Up` from that row (if not null)
- `scheduled_meeting` = the `Scheduled meeting` from that row (if not null)
- `created_by` = "Toma"

**Step 5: For single-row groups (173 companies that only appear once):**
- Create the lead/contact record as above
- The `first_note` is their only note
- If they have a `Next Follow Up` date, create a pending follow-up task/reminder
- No interaction history needed

### Phone number normalization rules
- Strip prefix `tel:` and `whatsapp:`
- Strip `+374` country code if present (or keep it, based on your phone field format)
- Store the original format in a `phone_raw` field if you want to preserve whatsapp/tel metadata
- Some phones are numeric (like `99533353`), some have special chars

### Important edge cases to handle
1. **Null contact persons**: ~40% of rows have no contact name — still create the company record, use "Unknown" or null for contact
2. **Same company, different contacts**: e.g. "Aerodynamics" has rows for both "Anahit" and "Kristina" — these should be TWO separate contact records under the same company
3. **Notes are in Armenian**: Store them as-is (UTF-8), don't try to translate
4. **The `Next Follow Up` on the LAST interaction** of each group is the most current — use it to set the lead's current follow-up reminder
5. **The `Scheduled meeting` field** is almost always null (only 4 rows have values) — when present, create a meeting/appointment record

### What I need you to do

1. First, look at my current database schema in `clozzet_v2` (check models, migrations, schema files)
2. If I don't have an interactions/activity_log table yet, create one
3. Write the import script that:
    - Reads the Excel file with pandas
    - Groups and transforms the data as described above
    - Inserts leads/contacts (deduped by company+contact_person)
    - Inserts interaction history linked to each lead
    - Sets the current `next_follow_up` from the latest interaction
    - Logs how many records were created (leads, interactions, follow-ups)
4. Make the script idempotent — if I run it twice, it shouldn't create duplicates
5. Add a `--dry-run` flag that shows what would be imported without writing to the database

### Stats to expect after import
- ~220 unique leads/contacts (some companies have multiple contacts)
- ~160 interaction history records (380 total rows minus ~220 first-contact rows)
- ~4 scheduled meeting records
- The data spans from 2026-02-24 to 2026-04-08

## PROMPT END
