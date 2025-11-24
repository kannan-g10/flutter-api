const SPREADSHEET_ID = "1y9l3l_fpCweWQyMz57DvZ0KJWuCtiMXtTYQqRkDNeI0";  
const SHEET_NAME     = "cheran_plastics"; 

const HEADERS = [
  "ID","Full Name","Gender","Marital Status","Spouse Name","Date of Birth",
  "Blood Group","Father Name","Mother Name","Mobile Number","Emergency Contact",
  "Apartment No","Street Name","City","State","Pincode",
  "Aadhar Number","PAN Number","Voter ID/Driving License","ESI Number",
  "PF UAN Number","Date of Joining",
  "Bank Name","Account Number","IFSC Code","Branch",
  "Aadhar Front","Aadhar Back","PAN Card","Employee Photo",
  "Is Active"
];

// Get or create the sheet
function getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);

  // Ensure headers exist
  const firstRow = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (firstRow.length < HEADERS.length || !firstRow.includes("Is Active")) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sh;
}

// Generate unique ID
function generateId() {
  const sh = getSheet();
  const lastRow = sh.getLastRow();
  let usedIds = [];

  if (lastRow > 1) {
    usedIds = sh.getRange(2, 1, lastRow - 1, 1)
      .getValues()
      .flat()
      .map(id => Number.parseInt(id))
      .filter(id => !Number.isNaN(id));
  }

  const START_ID = 1000;
  const maxId = usedIds.length > 0 ? Math.max(...usedIds) : START_ID;
  const nextId = (maxId < START_ID) ? START_ID + 1 : maxId + 1;

  return String(nextId);
}

// Handle GET requests
function doGet(e) {
  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  const rows = data.slice(1).map(r => {
    const obj = Object.fromEntries(HEADERS.map((h, i) => [h, r[i]]));
    // Convert Is Active to boolean
    obj["Is Active"] = (obj["Is Active"] === "TRUE" || obj["Is Active"] === true);
    return obj;
  });

  if (e.parameter.id) {
    const row = rows.find(r => r.ID == e.parameter.id);
    return row ? ok({data: row}) : err("Not found");
  }

  return ok({data: rows});
}

// Handle POST requests (create, update, delete)
function doPost(e) {
  const method = (e.parameter.method || "POST").toUpperCase();
  if (method === "POST") return create(e);
  if (method === "PUT") return update(e);
  if (method === "DELETE") return remove(e);
  return err("Unsupported method");
}

// Create new employee (Is Active always TRUE)
function create(e) {
  if (!e.postData || !e.postData.contents) return err("Missing request body");

  const payload = JSON.parse(e.postData.contents);
  const id = generateId();
  const sh = getSheet();

  const row = HEADERS.map(h => {
    if (h === "ID") return id;
    if (h === "Is Active") return "TRUE"; // always TRUE on creation
    return payload[h] || "";
  });

  sh.appendRow(row);
  return ok({message: "Saved", data: {ID: id}});
}

// Update employee (can change Is Active)
function update(e) {
  const id = e.parameter.id;
  if (!id) return err("ID required");

  const payload = JSON.parse(e.postData.contents);
  const sh = getSheet();
  const data = sh.getDataRange().getValues();

  let idx = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) { idx = i + 1; break; }
  }

  if (idx === -1) return err("Not found");

  const newRow = HEADERS.map(h => 
    h === "ID" ? id :
    (payload[h] !== undefined ? payload[h] : data[idx - 1][HEADERS.indexOf(h)])
  );

  sh.getRange(idx, 1, 1, HEADERS.length).setValues([newRow]);
  return ok({message: "Updated"});
}

// Delete employee
function remove(e) {
  const id = e.parameter.id;
  if (!id) return err("ID required");

  const sh = getSheet();
  const data = sh.getDataRange().getValues();
  let idx = -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) { idx = i + 1; break; }
  }

  if (idx === -1) return err("Not found");

  sh.deleteRow(idx);
  return ok({message: "Deleted"});
}

// Helpers for JSON responses
function ok(obj) { return json({status: "success", ...obj}); }
function err(msg) { return json({status: "error", message: msg}); }
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
                       .setMimeType(ContentService.MimeType.JSON);
}
