# LeaseAppsScript

## Creating a new Client sheet

1. Open the [template](https://docs.google.com/spreadsheets/d/1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw)

    1. Copying from another client sheet is actually better. This will copy
       over the imported ranges

2. Title the new Spreadsheet

3. Update the 'Config' sheet

    1. Add 'Show warning' protection to the entire Config sheet except the value
       column.

4. In any other sheet, like the template, open the OgunBank menu and select the
   option to register a new sheet. Paste in the spreadsheet ID of the new sheet.

5. Wait for the first valid email, label it correctly, and brace yourself.

6. Consider babysitting the first execution just to ensure it works properly.

## Development

### Install CLASP

Using the [Codelab](https://codelabs.developers.google.com/codelabs/clasp).

### Running Tests

- See [`clasp run` docs](https://github.com/google/clasp/#run)
- See [testrunner.ts](https://github.com/jamesoguntebi/AS_LeaseLib/blob/master/testing/testrunner.ts)

```
$ clasp run 'runTests'
```

- Run an individual file:

```
$ clasp run 'runTests' -p '["UtilTest"]'
```

By default, tests are run against the [template sheet](https://docs.google.com/spreadsheets/d/1e-xDkyts6jt_2JPGS5i1hX4opVJ9niQ9f0y8YtAvTlw). Pass a sheet id to run them against a different sheet.

```
$ clasp run 'runTests' -p '[{"spreadsheetId": "<id>", "testClassNames": ["UtilTest"]}]'
```

### Library Versions

In `appscript.json`, this project depends on other libraries at a specific
version.
