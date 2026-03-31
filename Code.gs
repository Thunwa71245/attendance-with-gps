var USERS_SHEET_NAME = "Users";
var ATTENDANCE_SHEET_NAME = "AttendanceLog";
var LEGACY_ATTENDANCE_SHEET_NAME = "dashboard";

var USERS_HEADERS = ["userId", "userName", "role", "password"];
var ATTENDANCE_HEADERS = [
  "userId",
  "userName",
  "scanDate",
  "checkInTime",
  "checkOutTime",
  "status",
  "timestamp",
  "room",
  "lateTime",
  "location",
  "distanceMeters"
];

function doGet(e) {
  var output = createJsonOutput();

  try {
    var params = (e && e.parameter) || {};

    if (params.id && params.name) {
      return output.setContent(JSON.stringify(findUserForLogin(params.id, params.name)));
    }

    if (params.student_id || params.userId) {
      var userId = params.student_id || params.userId;
      return output.setContent(JSON.stringify(getAttendanceRows(userId)));
    }

    return output.setContent(JSON.stringify(getAttendanceRows()));
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false,
      error: error.toString()
    }));
  }
}

function doPost(e) {
  var output = createJsonOutput();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return output.setContent(JSON.stringify({ success: false, message: "Missing request body" }));
    }

    var payload = JSON.parse(e.postData.contents);

    if (payload.action) {
      return output.setContent(JSON.stringify(handleAction(payload)));
    }

    if (payload.date && payload.student_id && payload.name) {
      return output.setContent(JSON.stringify(saveAttendance(payload)));
    }

    return output.setContent(JSON.stringify({ success: false, message: "Unsupported payload" }));
  } catch (error) {
    return output.setContent(JSON.stringify({
      success: false,
      message: error.toString()
    }));
  }
}

function handleAction(payload) {
  var action = String(payload.action || "").trim();

  if (action === "login") {
    return loginWithPassword(payload);
  }

  if (action === "createDefaultAdmin") {
    return ensureDefaultAdmin();
  }

  return { success: false, message: "Unknown action" };
}

function findUserForLogin(userId, userName) {
  var users = getUserRows();
  var normalizedId = normalizeValue(userId);
  var normalizedName = normalizeValue(userName);

  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    if (normalizeValue(user.userId) === normalizedId && normalizeValue(user.userName) === normalizedName) {
      return {
        success: true,
        status: "success",
        userId: user.userId,
        userName: user.userName,
        role: user.role || "user"
      };
    }
  }

  return {
    success: false,
    status: "error",
    message: "User not found"
  };
}

function loginWithPassword(payload) {
  var users = getUserRows();
  var userId = normalizeValue(payload.userId || payload.sid);
  var password = normalizeValue(payload.password || payload.pass);

  for (var i = 0; i < users.length; i++) {
    var user = users[i];
    if (normalizeValue(user.userId) === userId && normalizeValue(user.password) === password) {
      return {
        success: true,
        userId: user.userId,
        userName: user.userName,
        role: user.role || "user"
      };
    }
  }

  return {
    success: false,
    message: "Invalid user ID or password"
  };
}

function saveAttendance(payload) {
  var sheet = getOrCreateAttendanceSheet();
  var rows = sheet.getDataRange().getValues();
  var nowIso = new Date().toISOString();
  var location = payload.location || "-";
  var distanceMeters = payload.distance_meters || payload.distanceMeters || "-";

  for (var i = 1; i < rows.length; i++) {
    var rowUserId = normalizeValue(rows[i][0]);
    var rowDate = normalizeValue(rows[i][2]);

    if (rowUserId === normalizeValue(payload.student_id) && rowDate === normalizeValue(payload.date)) {
      sheet.getRange(i + 1, 2, 1, 10).setValues([[
        payload.name,
        payload.date,
        payload.check_in || rows[i][3] || "-",
        payload.check_out || rows[i][4] || "-",
        payload.status || rows[i][5] || "-",
        payload.timestamp || nowIso,
        payload.room || rows[i][7] || "-",
        payload.late_time || rows[i][8] || "-",
        location,
        distanceMeters
      ]]);

      return {
        success: true,
        message: "Attendance updated",
        action: "update"
      };
    }
  }

  sheet.appendRow([
    payload.student_id,
    payload.name,
    payload.date,
    payload.check_in || "-",
    payload.check_out || "-",
    payload.status || "-",
    payload.timestamp || nowIso,
    payload.room || "-",
    payload.late_time || "-",
    location,
    distanceMeters
  ]);

  return {
    success: true,
    message: "Attendance saved",
    action: "insert"
  };
}

function getAttendanceRows(filterUserId) {
  var sheet = getAttendanceSheet();
  if (!sheet) {
    return [];
  }

  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return [];
  }

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = mapAttendanceRow(values[i]);
    if (!row.userId || row.userId === "-") {
      continue;
    }

    if (filterUserId && normalizeValue(row.userId) !== normalizeValue(filterUserId)) {
      continue;
    }

    rows.push({
      StudentID: row.userId,
      Name: row.userName,
      Date: row.scanDate,
      CheckIn: row.checkInTime,
      CheckOut: row.checkOutTime,
      Status: row.status,
      LateTime: row.lateTime,
      Room: row.room,
      Timestamp: row.timestamp,
      Location: row.location,
      DistanceMeters: row.distanceMeters
    });
  }

  return rows;
}

function getUserRows() {
  var sheet = getOrCreateUsersSheet();
  var values = sheet.getDataRange().getValues();
  if (!values || values.length <= 1) {
    return [];
  }

  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    rows.push(mapUserRow(values[i], headers));
  }
  return rows;
}

function getOrCreateUsersSheet() {
  return getOrCreateSheet(USERS_SHEET_NAME, USERS_HEADERS);
}

function getOrCreateAttendanceSheet() {
  return getOrCreateSheet(ATTENDANCE_SHEET_NAME, ATTENDANCE_HEADERS);
}

function getAttendanceSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(ATTENDANCE_SHEET_NAME) || ss.getSheetByName(LEGACY_ATTENDANCE_SHEET_NAME);
}

function getOrCreateSheet(sheetName, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    return sheet;
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  return sheet;
}

function mapUserRow(row, headers) {
  var header0 = normalizeValue(headers && headers[0]);
  var header1 = normalizeValue(headers && headers[1]);
  var header2 = normalizeValue(headers && headers[2]);

  if (header0 === "userid" && header1 === "username") {
    return {
      userId: row[0] || "",
      userName: row[1] || "",
      role: row[2] || "user",
      password: row[3] || ""
    };
  }

  if (header0 === "sid" && header1 === "password") {
    var firstName = String(row[2] || "").trim();
    var lastName = String(row[3] || "").trim();
    return {
      userId: row[0] || "",
      userName: [firstName, lastName].join(" ").trim() || firstName,
      role: "user",
      password: row[1] || ""
    };
  }

  return {
    userId: row[0] || "",
    userName: row[1] || row[2] || "",
    role: header2 === "role" ? (row[2] || "user") : "user",
    password: row[3] || row[1] || ""
  };
}

function mapAttendanceRow(row) {
  if (row.length >= 11) {
    return {
      userId: row[0] || "-",
      userName: row[1] || "-",
      scanDate: row[2] || "-",
      checkInTime: row[3] || "-",
      checkOutTime: row[4] || "-",
      status: row[5] || "-",
      timestamp: row[6] || "-",
      room: row[7] || "-",
      lateTime: row[8] || "-",
      location: row[9] || "-",
      distanceMeters: row[10] || "-"
    };
  }

  return {
    userId: row[1] || row[0] || "-",
    userName: row[2] || "-",
    scanDate: row[0] || "-",
    checkInTime: row[4] || "-",
    checkOutTime: row[5] || "-",
    status: row[6] || "-",
    timestamp: row[0] && row[4] ? row[0] + " " + row[4] : "-",
    room: row[3] || "-",
    lateTime: row[7] || "-",
    location: "-",
    distanceMeters: "-"
  };
}

function ensureDefaultAdmin() {
  var sheet = getOrCreateUsersSheet();
  var users = getUserRows();
  for (var i = 0; i < users.length; i++) {
    if (normalizeValue(users[i].userId) === "001") {
      return { success: true, message: "Default admin already exists" };
    }
  }

  sheet.appendRow(["001", "System Admin", "admin", "Admin001"]);
  return { success: true, message: "Default admin created" };
}

function setupSheets() {
  getOrCreateUsersSheet();
  getOrCreateAttendanceSheet();
  ensureDefaultAdmin();
}

function createJsonOutput() {
  return ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
}

function normalizeValue(value) {
  return String(value === null || value === undefined ? "" : value).trim().toLowerCase();
}
