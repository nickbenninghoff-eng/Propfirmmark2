# Reminders & TODOs

Manage project reminders and todos stored in `.claude/reminders.md`.

## Instructions

1. **Read the reminders file** at `.claude/reminders.md` to see current todos and notes

2. **Based on user input, perform one of these actions:**

   - **No arguments / "show" / "list"**: Display the current reminders
   - **"add [text]"**: Add a new reminder item to the appropriate section
   - **"done [item]"**: Mark an item as completed (move to Completed section)
   - **"note [text]"**: Add a note to the General Notes section
   - **"clear done"**: Remove all completed items from the Completed section

3. **When adding items:**
   - Add new priority items under "Next Session Priority" in the appropriate category
   - If no category fits, add under "General Notes"
   - Use checkbox format: `- [ ] Item text`

4. **When marking done:**
   - Move the item to the "Completed Items" section
   - Change `- [ ]` to `- [x]`
   - Add completion date if significant

5. **Always update the "Last updated" date** at the bottom when making changes

6. **After any changes**, show the user what was updated

## File Location
`.claude/reminders.md`
