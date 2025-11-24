// =============================================================
//  CONTRACT EMPLOYEE CRUD API (ID-based updates, URL method control)
// =============================================================

const SPREADSHEET_ID = "1Lpl9Kgagy3W2k_JJTsmT1Btv8IJORQWpfs57LEm_jJ4";
const SHEET_NAME = "contract_employees_1";

const HEADERS = [
  "ID", "Consultancy Name", "Full Name", "Gender", "Marital Status", "Spouse Name",
  "Date of Birth", "Blood Group", "Father Name", "Mother Name",
  "Mobile Number", "Emergency Contact", "Door No", "Street Name", "Pincode",
  "Taluk", "District", "State", "Aadhar Number", "PAN Number",
  "Date of Joining", "Department", "Designation",
  "Aadhar Front", "Aadhar Back", "PAN Card", "Employee Photo",
  "Timestamp", "Is Active"
];

const CONSULTANCY_CODES = {
  "Asma Man Power Service": "ASM",
  "Nila Agency": "NIL",
  "GKS Associates": "GKS",
  "Mukesh Group": "MUK",
  "Anand Group": "ANA",
  "Sunil 2 Group": "SUN",
  "Mohan Man Power Contract": "MOH",
};

// ==================== UTILITY ====================
function getConsultancyPrefix(name) {
  return CONSULTANCY_CODES[name?.trim()] || "OTH";
}

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  const lastCol = sh.getLastColumn();
  const currentHeaders = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0] : [];

  if (currentHeaders.length !== HEADERS.length || currentHeaders[0] !== "ID") {
    sh.clear();
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sh;
}

function generateNextId(prefix) {
  const data = getSheet().getDataRange().getValues();
  let max = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0] || "");
    if (id.startsWith(prefix)) {
      const num = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  }
  return prefix + String(max + 1).padStart(4, "0");
}

// ==================== HANDLERS ====================
function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  try {
    let payload = {};
    if (e.postData?.contents) payload = JSON.parse(e.postData.contents);
    else if (Object.keys(e.parameter).length > 0) payload = e.parameter;

    // URL method parameter (default POST)
    let method = (e.parameter.method || "").toLowerCase() || "post";

    switch (method) {
      case "put": return update(payload);
      case "delete": return remove(payload);
      case "get": return read(payload);
      case "post":
      default: return create(payload);
    }
  } catch (error) {
    return err(`Server Error: ${error.message}`);
  }
}

// ==================== CRUD ====================
function create(payload) {
  if (!payload || Object.keys(payload).length === 0) return err("Missing request body");

  const consultancy = payload["Consultancy Name"]?.trim();
  if (!consultancy) return err("Consultancy Name is required");

  const prefix = getConsultancyPrefix(consultancy);
  const id = generateNextId(prefix);
  const sh = getSheet();

  const row = HEADERS.map(h => {
    if (h === "ID") return id;
    if (h === "Timestamp") return new Date();
    if (h === "Is Active") return (payload[h] || "TRUE").toString().toUpperCase();
    return payload[h] || "";
  });

  sh.appendRow(row);
  return ok({message: "Contract Employee Created", data: {ID: id}});
}

function read(payload) {
  const sh = getSheet();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return ok({data: []});

  const data = sh.getRange(1, 1, lastRow, HEADERS.length).getValues();
  const rows = data.slice(1).map((r, idx) => {
    const rowObject = {};
    HEADERS.forEach((h, i) => rowObject[h] = r[i] == null ? "" : r[i].toString());
    rowObject.rowIndex = idx + 2;
    return rowObject;
  });

  const idParam = payload?.id || payload?.ID;
  if (idParam) {
    const row = rows.find(r => r.ID === idParam.toString());
    return row ? ok({data: row}) : err(`Employee with ID ${idParam} not found`);
  }

  return ok({data: rows});
}

function update(payload) {
  if (!payload || Object.keys(payload).length === 0) return err("Missing request body");

  const id = payload.ID || payload.id;
  if (!id) return err("ID is required for update");

  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return err(`Employee with ID ${id} not found`);

  const existingRowData = data[rowIndex - 1];
  const newRow = HEADERS.map((h, i) => payload.hasOwnProperty(h) ? payload[h] : existingRowData[i]);

  sh.getRange(rowIndex, 1, 1, HEADERS.length).setValues([newRow]);
  return ok({message: `Employee ${id} updated successfully`, data: newRow});
}

function remove(payload) {
  const id = payload?.id || payload?.ID;
  if (!id) return err("ID required for deletion");

  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  let idx = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString() === id.toString()) {
      idx = i + 1;
      break;
    }
  }

  if (idx === -1) return err(`Employee ID ${id} not found`);

  sh.deleteRow(idx);
  return ok({message: `Employee ${id} deleted successfully`});
}

// ==================== RESPONSE ====================
function ok(obj) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", ...obj }))
    .setMimeType(ContentService.MimeType.JSON);
}

function err(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "error", message: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ==================== CORS / OPTIONS ====================
function doOptions(e) {
  // Respond with simple JSON to allow preflight
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}


