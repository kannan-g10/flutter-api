// FOR UNIT 1 SHEET URL

// =============================================================
//  SHEET CRUD – PUBLIC
// =============================================================
// !!! CHANGE THIS TO YOUR ACTUAL SPREADSHEET ID !!!
const SPREADSHEET_ID = "14--1dubvZXwS2azyGI_zRfPsmbF2c-yYkEyC9TGB1FE"; 
const SHEET_NAME     = "Employees";

// DEFINITIVE HEADERS LIST (33 columns total)
const HEADERS = [
  "ID", "Full Name", "Gender", "Marital Status", "Spouse Name", "Date of Birth",
  "Blood Group", "Father Name", "Mother Name", "Mobile Number", "Emergency Contact",
  "Apartment No", "Street Name", "City", "State", "Pincode",
  "Aadhar Number", "PAN Number", "Voter ID/Driving License", "ESI Number",
  "PF UAN Number", "Date of Joining", "Department", "Designation",
  "Bank Name", "Account Number", "IFSC Code", "Branch",
  "Aadhar Front", "Aadhar Back", "PAN Card", "Employee Photo",
  "Is Active"
];

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  
  // Create sheet if it doesn't exist
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  
  const currentHeaders = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  
  // Check if headers are missing or incomplete
  if (currentHeaders.length !== HEADERS.length || currentHeaders[0] !== "ID") {
    // Clear and set correct headers
    sh.clear(); 
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

function generateId() {
  const sh = getSheet();
  const lastRow = sh.getLastRow();
  let usedIds = [];
  
  if (lastRow > 1) {
    usedIds = sh.getRange(2, 1, lastRow - 1, 1)
      .getValues()
      .flat()
      .map(id => parseInt(id)) 
      .filter(id => !isNaN(id)); 
  }
  
  let nextId;
  const START_ID = 1000;
  
  if (usedIds.length === 0) {
    nextId = START_ID + 1;
  } else {
    const maxId = Math.max(...usedIds);
    nextId = (maxId < START_ID) ? START_ID + 1 : maxId + 1;
  }
  
  return String(nextId);
}

function doPost(e) {
  // Uses the 'method' parameter from the URL query string (e.g., ?method=PUT)
  const method = (e.parameter.method || "POST").toUpperCase(); 
  
  if (method === "POST")   return create(e);
  if (method === "PUT")    return update(e);
  if (method === "DELETE") return remove(e);
  
  return err(`Unsupported method: ${method}`);
}

/**
 * Returns all employee data or a single employee if 'id' is provided.
 */
function doGet(e) {
  const sh = getSheet();
  const lastRow = sh.getLastRow();
  // Read only up to the fixed number of headers (33 columns)
  const data = sh.getRange(1, 1, lastRow, HEADERS.length).getValues(); 
  
  if (data.length <= 1) return ok({data: []}); 
  
  const rows = data.slice(1).map((r, rowIndex) => {
    const rowObject = {};
    // Map using the fixed HEADERS array
    HEADERS.forEach((h, i) => {
    let value = r[i] == null ? "" : r[i].toString();
    // Normalize "Is Active" to uppercase
    if (h === "Is Active") value = value.toUpperCase();
    rowObject[h] = value;
  });
    // Add the 1-based index (Row 1 is headers, so data starts at Row 2)
    rowObject.rowIndex = rowIndex + 2; 
    return rowObject;
  });

  if (e.parameter.id) {
    const idToFind = e.parameter.id.toString();
    const row = rows.find(r => r.ID === idToFind);
    return row ? ok({data: row}) : err(`Employee with ID ${idToFind} not found.`);
  }
  return ok({data: rows});
}

/**
 * Creates a new employee record.
 */
function create(e) {
  if (!e.postData || !e.postData.contents) return err("Missing request body");
  const payload = JSON.parse(e.postData.contents);
  const id = generateId();
  const sh = getSheet();
  
  // Map payload to row using fixed HEADERS
  const row = HEADERS.map(h => {
    if (h === "ID") return id;
    if (h === "Is Active") return (payload[h] || "TRUE").toUpperCase();
    return payload[h] || "";
  });
  
  sh.appendRow(row);
  return ok({message: "Saved", data: {ID: id}});
}

/**
 * Updates an existing record. This relies on the 'rowIndex' being passed in the payload.
 */
function update(e) {
  if (!e.postData || !e.postData.contents) return err("Missing request body");
  const payload = JSON.parse(e.postData.contents);

  const rowIndex = payload.rowIndex;
  const id = payload.ID;
  
  if (!rowIndex || typeof rowIndex !== 'number') return err("rowIndex (number) is required for update in the payload.");
  if (!id) return err("ID is required for verification in the payload.");

  const sh = getSheet();
  const sheetRowIndex = parseInt(rowIndex);
  
  // Validation: Check if the row index is within the sheet's bounds
  if (sheetRowIndex < 2 || sheetRowIndex > sh.getLastRow()) {
    return err(`Invalid rowIndex: ${rowIndex}. Row not found or out of bounds.`);
  }

  // Get the existing row data from the sheet 
  const existingRowData = sh.getRange(sheetRowIndex, 1, 1, HEADERS.length).getValues()[0];
  
  // Verify that the ID in the payload matches the ID in the sheet at that row
  if (existingRowData[0].toString() !== id.toString()) { 
    return err(`ID mismatch. Row index ${sheetRowIndex} points to ID ${existingRowData[0]}, but payload requested ID ${id}.`);
  }

  // Map the new row: use ID, update based on payload, or keep existing value
  const newRow = HEADERS.map((h, i) => {
    if (payload.hasOwnProperty(h)) {
      if (h === "Is Active") {
        const val = payload[h];
        // Convert any truthy/falsy value to "TRUE" or "FALSE"
        return val === true || val === "true" || val === "TRUE" ? "TRUE" : "FALSE";
      }
      return payload[h] == null ? "" : payload[h];
    } 
    return existingRowData[i];
  });


  // Write the new data row back to the sheet
  sh.getRange(sheetRowIndex, 1, 1, HEADERS.length).setValues([newRow]);
  return ok({message: "Updated", data: payload});
}

function remove(e) {
  const id = e.parameter.id;
  if (!id) return err("ID required");
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  let idx = -1;
  for (let i = 1; i < data.length; i++) if (data[i][0].toString() === id.toString()) { idx = i + 1; break; }
  if (idx === -1) return err("Not found");
  sh.deleteRow(idx);
  return ok({message: "Deleted"});
}

function ok(obj)  { return json({status: "success", ...obj}); }
function err(msg) { return json({status: "error", message: msg}); }
function json(o)  {
  return ContentService.createTextOutput(JSON.stringify(o))
                       .setMimeType(ContentService.MimeType.JSON);
}
