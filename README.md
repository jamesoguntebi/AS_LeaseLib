# LeaseAppsScript

## Creating a new Client sheet

1. Open the [template](https://docs.google.com/spreadsheets/d/1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw)

    1. Copying from another client sheet is actually better. This will copy
       over the imported ranges

2. Title the new Spreadsheet

3. Update the 'Config' sheet

    1. Add 'Show warning' protection to the entire Config sheet except the value
       column.

4. Open the Script Editor. 'Tools' -> 'Script Editor'

5. Title the Script the same as the Spreadsheet

6. Note that there is an onOpen(). Manually run it. This will prompt to approve
   permissions. You may have to run it again after accepting permissions.

7. Go to Apps Script [My Executions](https://script.google.com/home/executions)
   page and see the most recent logs for onOpen. Ensure the script id was
   registered.

8. Wait for the first valid email, label it correctly, and brace yourself.

9. Consider babysitting the first execution just to ensure it works properly.