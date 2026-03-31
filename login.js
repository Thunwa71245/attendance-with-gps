const LOGIN_TIMEOUT_MS = 8000;
const ADMIN_CREDENTIALS = {
  id: "001",
  password: "Admin001"
};

const userTab = document.getElementById("userTab");
const adminTab = document.getElementById("adminTab");
const userForm = document.getElementById("userForm");
const adminForm = document.getElementById("adminForm");

function showUser() {
  userForm.classList.remove("hidden");
  adminForm.classList.add("hidden");
  userTab.classList.add("active-user");
  adminTab.classList.remove("active-admin");
}

function showAdmin() {
  adminForm.classList.remove("hidden");
  userForm.classList.add("hidden");
  adminTab.classList.add("active-admin");
  userTab.classList.remove("active-user");
}

function showAlert(options) {
  return Swal.fire({
    confirmButtonColor: "#2e7d32",
    backdrop: "rgba(15, 23, 42, 0.5)",
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: (modal) => modal.classList.add("popup-bounce"),
    ...options
  });
}

function setButtonState(selector, loadingText) {
  const button = document.querySelector(selector);
  if (!button) return () => {};

  const originalText = button.innerText;
  button.innerText = loadingText;
  button.disabled = true;

  return () => {
    button.innerText = originalText;
    button.disabled = false;
  };
}

function buildUserLookupUrl(studentId, studentName) {
  const apiUrl = typeof getConfiguredGasApiUrl === "function" ? getConfiguredGasApiUrl() : GAS_API_URL;
  const url = new URL(apiUrl);
  url.searchParams.set("id", studentId);
  url.searchParams.set("name", studentName);
  return url.toString();
}

function persistStudentProfile(studentId, studentName, role = "user") {
  localStorage.removeItem("adminLoggedIn");
  localStorage.setItem(
    "studentData",
    JSON.stringify({
      id: studentId,
      name: studentName,
      role,
      room: localStorage.getItem("default_room") || "",
      loggedInAt: new Date().toISOString()
    })
  );
}

async function userLogin() {
  const studentId = document.getElementById("userId").value.trim();
  const studentName = document.getElementById("userName").value.trim();

  if (!studentId || !studentName) {
    showAlert({
      icon: "warning",
      title: "กรุณากรอกข้อมูล",
      text: "โปรดกรอก Student ID และชื่อให้ครบถ้วน"
    });
    return;
  }

  if (!/^[0-9]+$/.test(studentId)) {
    showAlert({
      icon: "error",
      title: "ข้อมูลไม่ถูกต้อง",
      text: "Student ID ต้องเป็นตัวเลขเท่านั้น"
    });
    return;
  }

  const restoreButton = setButtonState("#userForm .btn", "กำลังตรวจสอบ...");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

  try {
    const response = await fetch(buildUserLookupUrl(studentId, studentName), {
      method: "GET",
      signal: controller.signal
    });
    const rawText = await response.text();

    let payload = null;
    try {
      payload = JSON.parse(rawText);
    } catch (error) {
      throw new Error("INVALID_RESPONSE");
    }

    if (payload.status === "success" || payload.success === true) {
      const resolvedUserId = payload.userId || studentId;
      const resolvedUserName = payload.userName || payload.name || studentName;
      persistStudentProfile(resolvedUserId, resolvedUserName, payload.role || "user");

      await showAlert({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        text: `ยินดีต้อนรับ ${resolvedUserName}`
      });

      window.location.href = "scan.html";
      return;
    }

    await showAlert({
      icon: "error",
      title: "ไม่พบข้อมูลผู้ใช้",
      text: payload.message || "ไม่พบผู้ใช้ในระบบ"
    });
  } catch (error) {
    const message =
      error.name === "AbortError"
        ? "การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง"
        : error.message === "INVALID_RESPONSE"
          ? "API ตอบกลับมาไม่อยู่ในรูปแบบที่ระบบใช้งานได้"
          : error.message || "ไม่สามารถเชื่อมต่อระบบได้";

    await showAlert({
      icon: "error",
      title: "เกิดข้อผิดพลาด",
      text: message
    });
  } finally {
    clearTimeout(timeoutId);
    restoreButton();
  }
}

async function adminLogin() {
  const adminId = document.getElementById("adminId").value.trim();
  const adminPass = document.getElementById("adminPass").value;

  if (adminId === ADMIN_CREDENTIALS.id && adminPass === ADMIN_CREDENTIALS.password) {
    localStorage.removeItem("studentData");
    localStorage.setItem("adminLoggedIn", "true");

    await showAlert({
      icon: "success",
      title: "เข้าสู่ระบบสำเร็จ",
      text: "กำลังเปิดหน้า dashboard"
    });

    window.location.href = "dashboard.html";
    return;
  }

  showAlert({
    icon: "error",
    title: "ข้อมูลไม่ถูกต้อง",
    text: "Admin ID หรือรหัสผ่านไม่ถูกต้อง"
  });
}
