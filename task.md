In the "Add New Customer" modal form, make the following changes:

Move Industry field to be the second field in the first row, right after Company Name (so the layout becomes: [Company Name] [Industry] in the first row).
Replace the single Contact Person, Phone, and Email fields with a dynamic contact persons array. Each contact entry should have these fields in a row or card:

Contact Person (required)
Position (new field)
Phone (optional)
Email (optional)


Validation rule: Position, Phone, and Email are only required/validated if a Contact Person name is entered. If Contact Person is empty, the entire row is ignored on submit.
Add a + button below the contact list to append a new empty contact group. Each contact row (except the first) should also have a remove/delete (×) button.
Initialize the form state with one empty contact entry by default:

jscontacts: [
{ contactPerson: '', position: '', phone: '', email: '' }
]

Update the form's submit handler to collect and include the full contacts array in the submitted data, filtering out entries where contactPerson is empty.

Keep all other fields (Status, Address, Website, LinkedIn Page, Next Follow-up Date, Notes) unchanged.
