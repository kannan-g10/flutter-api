const SPREADSHEET_ID = "1D98qcg_htgd-ynIIWtQ3WRPRBoLrVfVo9OH8A1ZTUG8";
const SHEET_NAME = "employees_unit2";

const HEADERS = ["ID","Full Name","Gender","Marital Status","Spouse Name","Date of Birth","Blood Group","Father Name","Mother Name","Mobile Number","Emergency Contact","Apartment No","Street Name","City","State","Pincode","Aadhar Number","PAN Number","Voter ID/Driving License","ESI Number","PF UAN Number","Date of Joining","Department","Designation","Bank Name","Account Number","IFSC Code","Branch","Aadhar Front","Aadhar Back","PAN Card","Employee Photo","Is Active"];

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  
  const currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn() || 1).getValues()[0];
  if (currentHeaders.join("") !== HEADERS.join("")) {
    sh.clearContents();
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    if (sh.getMaxColumns() < HEADERS.length) {
      sh.insertColumnsAfter(sh.getMaxColumns(), HEADERS.length - sh.getMaxColumns());
    }
  }
  return sh;
}

function generateId() {
  const sh = getSheet();
  const lastRow = sh.getLastRow();
  if (lastRow <= 1) return "1001";
  const ids = sh.getRange(2, 1, lastRow - 1, 1).getValues().flat();
  const max = Math.max(...ids.map(id => parseInt(id) || 0), 1000);
  return String(max + 1);
}

function doPost(e) {
  const action = (e.parameter.action || "CREATE").toUpperCase();
  if (action === "CREATE") return create(e);
  if (action === "UPDATE") return update(e);
  if (action === "DELETE") return remove(e);
  return err("Invalid action");
}

function doGet(e) {
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  const rows = data.slice(1).map(r => Object.fromEntries(HEADERS.map((h, i) => [h, r[i] || ""])));
  
  if (e.parameter.id) {
    const row = rows.find(r => String(r.ID) === String(e.parameter.id));
    return row ? ok({data: row}) : err("Not found");
  }
  return ok({data: rows});
}

function create(e) {
  if (!e.postData?.contents) return err("No data");
  const payload = JSON.parse(e.postData.contents);
  const id = generateId();
  const sh = getSheet();

  const row = HEADERS.map(h => h === "ID" ? id : h === "Is Active" ? true : payload[h] ?? "");
  sh.appendRow(row);
  return ok({message: "Saved", data: {ID: id}});
}

function update(e) {
  const id = e.parameter.id;
  if (!id || !e.postData?.contents) return err("Missing data");
  const payload = JSON.parse(e.postData.contents);
  const sh = getSheet();
  const data = sh.getDataRange().getValues();

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      rowIndex = i + 1;
      break;
    }
  }
  if (rowIndex === -1) return err("Not found");

  const newRow = HEADERS.map(h => {
    if (h === "ID") return id;
    return payload[h] !== undefined ? payload[h] : data[rowIndex - 1][HEADERS.indexOf(h)];
  });

  sh.getRange(rowIndex, 1, 1, HEADERS.length).setValues([newRow]);
  return ok({message: "Updated"});
}

function remove(e) {
  const id = e.parameter.id;
  if (!id) return err("ID required");
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return ok({message: "Deleted"});
    }
  }
  return err("Not found");
}

function resetSheetHeaders() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  // Clear everything (values + formatting)
  sh.clear();

  const requiredCols = HEADERS.length;
  const currentCols = sh.getMaxColumns();

  if (currentCols > requiredCols) {
    sh.deleteColumns(requiredCols + 1, currentCols - requiredCols);
  } else if (currentCols < requiredCols) {
    sh.insertColumnsAfter(currentCols, requiredCols - currentCols);
  }

  // Set header row
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);

  // Freeze header row
  sh.setFrozenRows(1);

  // Important: Wait for Google Sheets to update internally
  SpreadsheetApp.flush();

  // Apply formatting
  const headerRange = sh.getRange(1, 1, 1, HEADERS.length);
  headerRange.setFontWeight("bold");
  headerRange.setFontSize(11);
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  headerRange.setBackground("#d9e1f2");
  headerRange.setBorder(true, true, true, true, true, true);

  // Auto resize columns
  sh.autoResizeColumns(1, HEADERS.length);

  return ContentService.createTextOutput(
    JSON.stringify({
      status: "success",
      message: "Headers reset and formatted"
    })
  ).setMimeType(ContentService.MimeType.JSON);
}


function ok(obj) { return json({status: "success", ...obj}); }
function err(msg) { return json({status: "error", message: msg}); }
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
