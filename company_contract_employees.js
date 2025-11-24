const SPREADSHEET_ID = "1-2JAavCkd-f50IvqZqFX8E2lHgBOuPCeQW12mOgMfKI";
const SHEET_NAME = "company_contract_employees";

const HEADERS = [
  "ID", "Department", "Designation", "Full Name", "Gender",
  "Marital Status", "Spouse Name", "Date of Birth", "Blood Group",
  "Father Name", "Mother Name", "Mobile Number", "Emergency Contact",
  "Apartment No", "Street Name", "City", "State", "Pincode",
  "Aadhar Number", "PAN Number", "Voter ID/Driving License", "ESI Number",
  "PF UAN Number", "Date of Joining", "Bank Name", "Account Number",
  "IFSC Code", "Branch", "Aadhar Front", "Aadhar Back", "PAN Card",
  "Employee Photo", "Is Active"
];

function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  const lastColumn = sh.getLastColumn();
  const currentHeaders = lastColumn > 0 ? sh.getRange(1, 1, 1, lastColumn).getValues()[0] : [];

  if (currentHeaders.length !== HEADERS.length || currentHeaders[0] !== "ID") {
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
      .map(id => id.toString().replace("CC", ""))
      .map(Number)
      .filter(n => !isNaN(n));
  }

  const nextNumber = usedIds.length === 0 ? 1 : Math.max(...usedIds) + 1;
  return "CC" + nextNumber.toString().padStart(4, "0");
}

// ===================== POST =====================
function doPost(e) {
  const method = e.parameter.method ? e.parameter.method.toLowerCase() : null;
  const id = e.parameter.id;

  if ((method === "get") || (method === null && id)) {
    // Support GET-style response via POST
    return handleGet(id);
  } else if (method === "put" && id) {
    return updateEmployee(e, id);
  } else if (method === "delete" && id) {
    return deleteEmployee(e, id);
  } else {
    return createEmployee(e);
  }
}

function handleGet(id) {
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  const jsonData = data.slice(1).map(row => {
    let obj = {};
    HEADERS.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  if (id) {
    const emp = jsonData.find(emp => emp.ID === id);
    if (emp) return ok({ employee: emp });
    else return err("Employee not found");
  }

  return ok({ employees: jsonData });
}

function createEmployee(e) {
  if (!e.postData || !e.postData.contents) return err("Missing request body");
  const payload = JSON.parse(e.postData.contents);
  const sh = getSheet();
  const id = generateId();

  const row = HEADERS.map(h => {
    if (h === "ID") return id;
    if (h === "Is Active") return "TRUE";
    return payload[h] || "";
  });

  sh.appendRow(row);
  return ok({ message: "Employee created successfully", data: { ID: id } });
}

function updateEmployee(e, id) {
  if (!e.postData || !e.postData.contents) return err("Missing request body");
  const payload = JSON.parse(e.postData.contents);
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  const rowIndex = data.findIndex(r => r[0].toString() === id.toString());

  if (rowIndex < 1) return err("Employee not found");

  const existingRow = data[rowIndex];

  const newRow = HEADERS.map((h, i) => {
    return payload[h] != null ? payload[h] : existingRow[i];
  });

  sh.getRange(rowIndex + 1, 1, 1, HEADERS.length).setValues([newRow]);
  return ok({ message: "Employee updated successfully", data: payload });
}

function deleteEmployee(e, id) {
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  const rowIndex = data.findIndex(r => r[0].toString() === id.toString());

  if (rowIndex < 1) return err("Employee not found");

  sh.getRange(rowIndex + 1, HEADERS.indexOf("Is Active") + 1).setValue("FALSE");
  return ok({ message: "Employee deactivated successfully", ID: id });
}

// ===================== GET =====================
function doGet(e) {
  const id = e.parameter.ID;
  return handleGet(id);
}

// ===================== HELPERS =====================
function ok(obj) {
  return json({ status: "success", ...obj });
}

function err(msg) {
  return json({ status: "error", message: msg });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}
