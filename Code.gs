// ==========================================
// ระบบบริหารการเข้างาน - Google Apps Script
// ==========================================
// แท็บ Google Sheet ที่จำเป็น:
// - "dashboard" : สำหรับบันทึกข้อมูลการเข้างาน
// - "Users" : สำหรับจัดการข้อมูลผู้ใช้

function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    // การจัดการข้อผิดพลาด: กรณีไม่มีการส่งข้อมูล
    if (!e.postData || !e.postData.contents) {
      return output.setContent(JSON.stringify({ 
        success: false, 
        message: "ไม่ได้รับข้อมูล" 
      });
    }

    // แปลง JSON ที่ได้รับ
    var payload = JSON.parse(e.postData.contents);
    
    // ==========================================
    // 1️⃣ บันทึกข้อมูลการเข้างาน (Attendance Check-in)
    // ==========================================
    if (payload.date && payload.student_id && payload.name) {
      return saveAttendance(payload, output);
    }
    
    // ==========================================
    // 2️⃣ การจัดการการลงทะเบียน/เข้าสู่ระบบ
    // ==========================================
    if (payload.action) {
      return handleUserAction(payload, output);
    }
    
    return output.setContent(JSON.stringify({ 
      success: false, 
      message: "คำขอไม่ถูกต้อง" 
    }));

  } catch (error) {
    Logger.log("ข้อผิดพลาด: " + error.toString());
    return output.setContent(JSON.stringify({ 
      success: false, 
      message: "ข้อผิดพลาด: " + error.toString() 
    }));
  }
}

// ==========================================
// บันทึกข้อมูลการเข้างานลงใน Google Sheet
// ==========================================
function saveAttendance(payload, output) {
  try {
    // รับชีต "dashboard"
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("dashboard");
    
    if (!sheet) {
      // สร้างชีตหากไม่มีอยู่
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("dashboard");
      
      // เพิ่มแถวหัวเรื่อง
      sheet.appendRow([
        "Date",        // A: วันที่
        "StudentID",   // B: รหัสนักศึกษา
        "Name",        // C: ชื่อ
        "Room",        // D: ห้อง
        "CheckIn",     // E: เวลาเข้า
        "CheckOut",    // F: เวลาออก
        "Status",      // G: สถานะ
        "LateTime"     // H: เวลาสาย
      ]);
    }

    // ตรวจสอบซ้ำ (นักศึกษาเดียวกันในวันเดียวกัน)
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === payload.date && data[i][1] === payload.student_id) {
        // อัพเดตข้อมูลหากมีบันทึกในวันเดียวกันแล้ว
        sheet.getRange(i + 1, 5, 1, 4).setValues([[
          payload.check_in,
          payload.check_out,
          payload.status,
          payload.late_time
        ]]);
        
        return output.setContent(JSON.stringify({ 
          success: true, 
          message: "อัพเดตข้อมูลการเข้างานเรียบร้อย",
          action: "update"
        }));
      }
    }

    // เพิ่มบันทึกใหม่
    sheet.appendRow([
      payload.date,
      payload.student_id,
      payload.name,
      payload.room,
      payload.check_in,
      payload.check_out,
      payload.status,
      payload.late_time
    ]);

    Logger.log("✅ บันทึกข้อมูลการเข้างาน: " + payload.student_id + " - " + payload.name);

    return output.setContent(JSON.stringify({ 
      success: true, 
      message: "บันทึกข้อมูลการเข้างานเรียบร้อย",
      action: "insert"
    }));

  } catch (error) {
    Logger.log("ข้อผิดพลาดในการบันทึกข้อมูลการเข้างาน: " + error.toString());
    return output.setContent(JSON.stringify({ 
      success: false, 
      message: "ล้มเหลวในการบันทึกข้อมูล: " + error.toString() 
    }));
  }
}

// ==========================================
// การจัดการการกระทำของผู้ใช้ (ลงทะเบียน/เข้าสู่ระบบ)
// ==========================================
function handleUserAction(payload, output) {
  var action = payload.action;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
  
  if (!sheet) {
    return output.setContent(JSON.stringify({ 
      success: false, 
      message: "กรุณาสร้างชีต 'Users'" 
    }));
  }

  var data = sheet.getDataRange().getValues();

  // 1️⃣ ลงทะเบียนผู้ใช้
  if (action === "register") {
    // ตรวจสอบรหัสซ้ำ
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == payload.sid) {
        return output.setContent(JSON.stringify({ 
          success: false, 
          message: "รหัสนักศึกษานี้ลงทะเบียนแล้ว" 
        }));
      }
    }
    
    var d = payload.data;
    // ลำดับคอลัมน์: SID, Password, Fname, Lname, Phone, DOB, Email, IDCard
    sheet.appendRow([payload.sid, payload.pass, d.fname, d.lname, d.phone, d.dob, d.email, d.idcard]);
    
    return output.setContent(JSON.stringify({ success: true }));
  }
  
  // 2️⃣ เข้าสู่ระบบ
  else if (action === "login") {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == payload.sid && data[i][1] == payload.pass) {
        return output.setContent(JSON.stringify({ 
          success: true, 
          name: data[i][2] // ส่งชื่อกลับ
        }));
      }
    }
    return output.setContent(JSON.stringify({ 
      success: false, 
      message: "รหัสนักศึกษา หรือ รหัสผ่านไม่ถูกต้อง" 
    }));
  }
  
  // 3️⃣ ตรวจสอบผู้ใช้
  else if (action === "checkUser") {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == payload.sid) {
        return output.setContent(JSON.stringify({ success: true }));
      }
    }
    return output.setContent(JSON.stringify({ success: false }));
  }

  // 4️⃣ ยืนยันผู้ใช้
  else if (action === "verifyUser") {
    var colMap = { 'phone': 4, 'dob': 5, 'email': 6, 'idcard': 7 };
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == payload.sid) {
        var val1 = data[i][colMap[payload.k1]];
        var val2 = data[i][colMap[payload.k2]];
        
        if (val1 == payload.v1 && val2 == payload.v2) {
          return output.setContent(JSON.stringify({ success: true }));
        }
      }
    }
    return output.setContent(JSON.stringify({ success: false }));
  }

  // 5️⃣ รีเซ็ตรหัสผ่าน
  else if (action === "resetPassword") {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] == payload.sid) {
        sheet.getRange(i + 1, 2).setValue(payload.newPass);
        return output.setContent(JSON.stringify({ success: true }));
      }
    }
    return output.setContent(JSON.stringify({ success: false }));
  }

  return output.setContent(JSON.stringify({ 
    success: false, 
    message: "การดำเนินการไม่ถูกต้อง" 
  }));
}

// ==========================================
// แก้ไขข้อบกพร่อง: ตั้งค่า Google Sheet
// ==========================================
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // สร้างชีต "dashboard"
  try {
    var dashSheet = ss.getSheetByName("dashboard");
    if (!dashSheet) {
      dashSheet = ss.insertSheet("dashboard");
      dashSheet.appendRow(["Date", "StudentID", "Name", "Room", "CheckIn", "CheckOut", "Status", "LateTime"]);
    }
    Logger.log("✅ ชีต 'dashboard' พร้อมใช้งาน");
  } catch (e) {
    Logger.log("❌ ข้อผิดพลาด: " + e.toString());
  }
  
  // สร้างชีต "Users"
  try {
    var usersSheet = ss.getSheetByName("Users");
    if (!usersSheet) {
      usersSheet = ss.insertSheet("Users");
      usersSheet.appendRow(["SID", "Password", "Fname", "Lname", "Phone", "DOB", "Email", "IDCard"]);
    }
    Logger.log("✅ ชีต 'Users' พร้อมใช้งาน");
  } catch (e) {
    Logger.log("❌ ข้อผิดพลาด: " + e.toString());
  }
}
