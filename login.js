// App Script
const url = "https://script.google.com/macros/s/AKfycbznrBpQ50ND_nI2JEnGG57GVbBIjkrMVJnK8OuvWq547GdGKL7fatHxPIkzrbgUZURq2w/exec";

// switch tab
function showUser() {
    userForm.classList.remove("hidden");
    adminForm.classList.add("hidden");

    userTab.classList.add("active-user");
    userTab.classList.remove("active-admin");

    adminTab.classList.remove("active-admin");
}

function showAdmin() {
    adminForm.classList.remove("hidden");
    userForm.classList.add("hidden");

    adminTab.classList.add("active-admin");
    userTab.classList.remove("active-user");
}

// user login
function userLogin() {
    let id = document.getElementById("userId").value.trim();
    let name = document.getElementById("userName").value.trim();

    if (id === "" || name === "") {
        Swal.fire({
            icon: 'warning',
            title: 'กรุณากรอกข้อมูล',
            text: 'โปรดกรอกข้อมูลให้ครบถ้วน',
            confirmButtonColor: '#2e7d32',
            backdrop: 'rgba(15, 23, 42, 0.5)',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: (modal) => modal.classList.add('popup-bounce')
        });
        return;
    }

    if (!/^[0-9]+$/.test(id)) {
        Swal.fire({
            icon: 'error',
            title: 'รูปแบบข้อมูลไม่ถูกต้อง',
            text: 'ID ต้องเป็นตัวเลขเท่านั้น',
            confirmButtonColor: '#2e7d32',
            backdrop: 'rgba(15, 23, 42, 0.5)',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: (modal) => modal.classList.add('popup-bounce')
        });
        return;
    }

    const btn = document.querySelector("#userForm .btn");
    const originalText = btn.innerText;
    btn.innerText = "กำลังตรวจสอบ...";
    btn.disabled = true;

    // ตั้ง timeout 5 วินาที
    const timeoutId = setTimeout(() => {
        btn.innerText = originalText;
        btn.disabled = false;
        Swal.fire({
            icon: 'error',
            title: 'หมดเวลา',
            text: 'การตรวจสอบใช้เวลานานเกินไป โปรดลองอีกครั้ง',
            confirmButtonColor: '#2e7d32',
            backdrop: 'rgba(15, 23, 42, 0.5)',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: (modal) => modal.classList.add('popup-bounce')
        });
    }, 5000);

    // ทำการส่งข้อมูลผ่าน HTTP GET เพื่อตัดปัญหาเรื่อง CORS Preflight
    const fetchUrl = `${url}?id=${encodeURIComponent(id)}&name=${encodeURIComponent(name)}`;

    fetch(fetchUrl)
        .then(res => res.text()) // รับมาเป็น text เพื่อตรวจสอบก่อน
        .then(text => {
            clearTimeout(timeoutId);
            btn.innerText = originalText;
            btn.disabled = false;

            try {
                const data = JSON.parse(text);

                if (data.status === "success") {
                    // Store user info in localStorage for scan page
                    localStorage.setItem('user_id', id);
                    localStorage.setItem('user_name', name);
                    localStorage.setItem('user_role', 'user');

                    Swal.fire({
                        icon: 'success',
                        title: 'สำเร็จ',
                        text: 'ลงทะเบียนสำเร็จ',
                        confirmButtonColor: '#2e7d32',
                        backdrop: 'rgba(15, 23, 42, 0.5)',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: (modal) => modal.classList.add('popup-bounce')
                    }).then(() => {
                        window.location.href = "scan.html";
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่พบข้อมูล',
                        text: data.message || "ไม่พบข้อมูลในระบบ",
                        confirmButtonColor: '#2e7d32',
                        backdrop: 'rgba(15, 23, 42, 0.5)',
                        allowOutsideClick: false,
                        allowEscapeKey: false,
                        didOpen: (modal) => modal.classList.add('popup-bounce')
                    });
                }
            } catch (e) {
                console.error("Text Output:", text);
                Swal.fire({
                    icon: 'error',
                    title: 'เกิดข้อผิดพลาด',
                    text: 'ระบบเกิดข้อผิดพลาดในการรับข้อมูล (เช่น ไม่ได้ตั้งสิทธิ์ Apps Script เป็น Anyone)',
                    confirmButtonColor: '#2e7d32',
                    backdrop: 'rgba(15, 23, 42, 0.5)',
                    allowOutsideClick: false,
                    allowEscapeKey: false,
                    didOpen: (modal) => modal.classList.add('popup-bounce')
                });
            }
        })
        .catch(error => {
            clearTimeout(timeoutId);
            btn.innerText = originalText;
            btn.disabled = false;
            console.error("Fetch Error:", error);
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
                text: error.message,
                confirmButtonColor: '#2e7d32',
                backdrop: 'rgba(15, 23, 42, 0.5)',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: (modal) => modal.classList.add('popup-bounce')
            });
        });
}

// admin login
function adminLogin() {
    const adminIdInput = document.getElementById("adminId").value;
    const adminPassInput = document.getElementById("adminPass").value;

    if (adminIdInput === "001" && adminPassInput === "Admin001") {
        // Store admin session
        localStorage.setItem('user_role', 'admin');

        Swal.fire({
            icon: 'success',
            title: 'สำเร็จ',
            text: 'เข้าสู่ระบบผู้ดูแลสำเร็จ',
            confirmButtonColor: '#2e7d32',
            backdrop: 'rgba(15, 23, 42, 0.5)',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: (modal) => modal.classList.add('popup-bounce')
        }).then(() => {
            window.location.href = 'admin.html';
        });
    } else {
        Swal.fire({
            icon: 'error',
            title: 'ข้อมูลไม่ถูกต้อง',
            text: 'โปรดตรวจสอบ ID และรหัสผ่าน',
            confirmButtonColor: '#2e7d32',
            backdrop: 'rgba(15, 23, 42, 0.5)',
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: (modal) => modal.classList.add('popup-bounce')
        });
    }
}