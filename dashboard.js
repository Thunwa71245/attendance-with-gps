let allAttendanceData = [];
let charts = {};
let currentMonth = new Date(2026, 2, 30);
let detailModalMonth = new Date(2026, 2, 30);
let detailModalEmployeeName = '';
let detailChartInstance = null;
let currentEmployeeData = [];
let isLoadingData = false;
const CACHE_KEY = 'attendance_data_cache';
const CACHE_EXPIRY_KEY = 'attendance_cache_expiry';
const CACHE_VALIDITY_MINUTES = 5; // แคชได้ 5 นาที

document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();
    setupTabNavigation();
    initializeDashboard();
});

// กรองชื่อทดสอบ / ข้อมูลตัวอย่างที่ไม่ต้องการแสดง
function isTestName(name) {
    if (!name) return true;
    const s = String(name).toLowerCase().trim();
    if (s === '' || s === '-' ) return true;
    // รายการคำที่มักเป็นข้อมูลทดสอบหรือหัวตาราง
    const blacklist = ['name', 'test', 'test user', 'test ah', 'test an', 'p นำออก'];
    for (const bad of blacklist) {
        if (s === bad || s.includes(bad)) return true;
    }
    // กรองคำที่เกี่ยวกับการนำออก/export (บางครั้งถูกผนวกเข้ามาจาก UI)
    if (s.includes('นำออก') || s.includes('export')) return true;
    return false;
}

function initializeDashboard() {
    updateCurrentDate();
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000); // อัพเดตเวลาทุกวินาที
    updateMonthDisplay();
    // โหลดข้อมูลเก่าจากแคชก่อน
    loadCachedData();
    // ดึงข้อมูลใหม่ในพื้นหลัง
    loadAttendanceData();
}

function updateCurrentDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Bangkok' };
    const today = new Date().toLocaleDateString('th-TH', options);
    document.getElementById('currentDate').textContent = today;
}

function updateCurrentTime() {
    const now = new Date();
    const timeOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Bangkok' };
    const timeString = now.toLocaleTimeString('th-TH', timeOptions);
    document.getElementById('currentTime').textContent = '🕐 ' + timeString + ' น.';
}

function updateMonthDisplay() {
    const options = { month: 'long', year: 'numeric' };
    const monthText = currentMonth.toLocaleDateString('th-TH', options);
    document.getElementById('monthDisplay').textContent = monthText + ' 📅';
    updateDashboard();
}

function changeMonth(direction) {
    currentMonth.setMonth(currentMonth.getMonth() + direction);
    updateMonthDisplay();
}

function updateDetailMonthYearDisplay() {
    const options = { month: 'long', year: 'numeric' };
    const monthText = detailModalMonth.toLocaleDateString('th-TH', options);
    document.getElementById('detailMonthDisplay').textContent = monthText + ' 📅';
}

function setApiStatus(statusType, text) {
    const el = document.getElementById('apiStatus');
    el.className = 'api-status ' + statusType;
    el.textContent = text;
}

// 💾 โหลดข้อมูลจากแคช
function loadCachedData() {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        const expiry = localStorage.getItem(CACHE_EXPIRY_KEY);
        
        if (cached && expiry) {
            const now = new Date().getTime();
            if (now < parseInt(expiry)) {
                const cachedData = JSON.parse(cached);
                setApiStatus('success', '✓ ข้อมูลแคช');
                processData(cachedData);
                return true;
            }
        }
    } catch (e) {
        console.log('แคชไม่พร้อมใช้');
    }
    return false;
}

// 💾 บันทึกข้อมูลลงแคช
function saveCacheData(data) {
    try {
        const expiry = new Date().getTime() + (CACHE_VALIDITY_MINUTES * 60 * 1000);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_EXPIRY_KEY, expiry.toString());
    } catch (e) {
        console.log('ไม่สามารถบันทึกแคช');
    }
}

function setApiStatus(statusType, text) {
    const el = document.getElementById('apiStatus');
    el.className = 'api-status ' + statusType;
    el.textContent = text;
}

// 🔄 ดึงข้อมูล
async function loadAttendanceData() {
    if (isLoadingData) return; // ป้องกันการดึงหลายครั้ง
    
    const webAppUrl = 'https://script.google.com/macros/s/AKfycbxkthm6Kmq61oSckBHv6wGerL2bdgvn-k1yTWbrqOjeSlcjwgV3JEjoOhq3i8933YRS1w/exec';
    isLoadingData = true;
    
    try {
        setApiStatus('loading', '⌛ อัพเดตข้อมูล...');
        
        const response = await fetch(webAppUrl);

        if (!response.ok) {
            throw new Error('NETWORK_ERROR');
        }

        let rawData = await response.json();

        if (rawData && rawData.error) {
            throw new Error('API_ERROR: ' + rawData.error);
        }

        if (rawData && !Array.isArray(rawData) && Array.isArray(rawData.data)) {
            rawData = rawData.data;
        }

        if (!Array.isArray(rawData)) {
            console.warn("Data received is not an array:", rawData);
            throw new Error('INVALID_DATA_FORMAT');
        }

        const validData = rawData.filter(row => {
            const hasDate = row['Date'] && String(row['Date']) !== '-';
            const hasName = row['Name'] && String(row['Name']) !== '-';
            return hasDate && hasName;
        });

        setApiStatus('success', '✓ เชื่อมต่อ');
        // บันทึกข้อมูลลงแคช
        saveCacheData(validData);
        processData(validData);

    } catch (err) {
        console.warn("พบปัญหาการเชื่อมต่อ:", err.message);
        
        // ถ้ามีแคชให้ใช้แคช ไม่ต้องแสดงข้อผิดพลาด
        if (!loadCachedData()) {
            setApiStatus('error', '✕ ล้มเหลว');
            
            let helpMessage = "";
            if (err.message.startsWith('API_ERROR:')) {
                helpMessage = `
                    2. <strong>ข้อผิดพลาดจากฝั่ง Google Apps Script:</strong><br>
                       ระบบ Apps Script ของคุณส่งแจ้งเตือนนี้กลับมา: <br>
                       <code style="display:inline-block; margin-top:5px; padding:4px 8px; background:#fee2e2; border-radius:4px; color:#991b1b;">${err.message.replace('API_ERROR: ', '')}</code><br>
                       โปรดตรวจสอบโค้ดฝั่ง Google Sheet หรือ Apps Script ของคุณ
                `;
            } else if (err.message === 'INVALID_DATA_FORMAT') {
                helpMessage = `
                    2. <strong>ปัญหา "รูปแบบข้อมูลไม่ถูกต้อง":</strong><br>
                       API ตอบกลับมาเป็น JSON แต่ไม่ได้เป็นรูปแบบตาราง (Array) โปรดตรวจสอบโค้ดฝั่ง Google Apps Script ในฟังก์ชัน <code>doGet()</code> ว่าส่งข้อมูลกลับมาเป็น Array หรือไม่
                `;
            } else {
                helpMessage = `
                    2. <strong>หากเปิดลิงก์แล้วเจอหน้าแจ้งเตือน (Google Error):</strong><br>
                       แสดงว่าคุณยังไม่ได้ตั้งค่าสิทธิ์ให้เป็น <b>"ทุกคน" (Anyone)</b> คุณต้องกลับไปที่ Google Apps Script เพื่อกด Deploy เป็น "เวอร์ชันใหม่" (New version) และเปลี่ยนสิทธิ์ให้ถูกต้องก่อน<br><br>
                    3. <strong>หากเปิดลิงก์แล้วเห็นข้อมูลหน้าตาแบบตัวหนังสือ (JSON):</strong><br>
                       แสดงว่าฝั่ง API ทำงานปกติ แต่ตัวโปรแกรมพรีวิวนี้ถูกจำกัดการดึงข้อมูลข้ามโดเมน (CORS) <b>วิธีแก้คือ ให้คุณนำไฟล์ HTML นี้ไปเปิดในคอมพิวเตอร์ของคุณเองโดยตรง (ดับเบิลคลิกไฟล์ index.html)</b> ข้อมูลจะแสดงผลได้ตามปกติครับ
                `;
            }

            document.getElementById('attendanceTable').innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 40px; color: var(--danger-color); font-weight: 500; line-height: 1.6;">
                        <div style="font-size: 18px; margin-bottom: 12px;">❌ เชื่อมต่อล้มเหลว หรือดึงข้อมูลผิดพลาด</div>
                        <div style="background: #fef2f2; border: 1px solid #fca5a5; padding: 20px; border-radius: 8px; display: inline-block; text-align: left; max-width: 650px; color: #991b1b; font-size: 14px;">
                            <strong style="font-size: 16px;">💡 วิธีตรวจสอบสาเหตุ:</strong><br><br>
                            1. <a href="${webAppUrl}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: 600;">👉 คลิกที่นี่เพื่อเปิดลิงก์ API ในแท็บใหม่</a><br><br>
                            ${helpMessage}
                        </div>
                        <div style="margin-top: 25px;">
                            <button onclick="loadMockData()" style="padding: 10px 20px; background: var(--primary-color); color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 500; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                                ✨ ทดลองโหลดข้อมูลจำลอง (Mock Data)
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }
    } finally {
        isLoadingData = false;
    }
}

// ฟังก์ชันจัดการข้อมูล ⚡ (ปรับปรุงดำเนินการอย่างรวดเร็ว)
function processData(rawData) {
    if (!Array.isArray(rawData)) return;

    const uniqueDataMap = new Map();
    const normalizeStatus = (val) => {
        if (!val) return 'absent';
        const s = String(val).toLowerCase().trim();
        if (s === 'on-time' || s.includes('ตรงเวลา') || s.includes('ปกติ')) return 'on-time';
        if (s === 'late' || s.includes('สาย')) return 'late';
        if (s === 'absent' || s.includes('ขาด') || s.includes('ลา')) return 'absent';
        return 'absent';
    };

    // ประมวลผลข้อมูลแบบ batch
    for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i];
        const name = String(row['Name'] || 'ไม่ระบุชื่อ').trim();
        const date = String(row['Date'] || '-') .trim();
        
        if (!name || name === '-' || !date || date === '-') continue;
        if (isTestName(name)) continue; // ข้ามรายการทดสอบ / ตัวอย่าง

        const studentId = String(row['StudentID'] || '-').trim();
        const room = String(row['Room'] || '-').trim();
        const checkIn = String(row['CheckIn'] || '-').trim();
        const checkOut = String(row['CheckOut'] || '-').trim();
        const rawStatus = String(row['Status'] || '-').trim();
        const lateTime = String(row['LateTime'] || '').trim();

        const key = `${name}-${date}`;

        if (!uniqueDataMap.has(key)) {
            let status = normalizeStatus(rawStatus);
            
            if (checkIn !== '-') {
                try {
                    const [hours, minutes] = checkIn.split(':').map(Number);
                    if (hours >= 17) {
                        status = 'absent';
                    }
                } catch (e) {
                    // หากวิเคราะห์เวลาไม่ได้ให้ใช้สถานะเดิม
                }
            }
            
            uniqueDataMap.set(key, {
                name, date, studentId, room, lateTime,
                entryTime: checkIn, exitTime: checkOut,
                status: status,
                attendanceDays: 1
            });
        }
    }

    allAttendanceData = Array.from(uniqueDataMap.values());
    calculateAttendanceDaysOptimized();
    requestAnimationFrame(() => updateDashboard());
}

function calculateAttendanceDaysOptimized() {
    const monthMap = new Map();

    for (let i = 0; i < allAttendanceData.length; i++) {
        const record = allAttendanceData[i];
        if (isDateInCurrentMonth(record.date)) {
            const key = record.name;
            if (record.status !== 'absent') {
                monthMap.set(key, (monthMap.get(key) || 0) + 1);
            }
        }
    }

    for (let i = 0; i < allAttendanceData.length; i++) {
        allAttendanceData[i].attendanceDays = monthMap.get(allAttendanceData[i].name) || 0;
    }
}

function calculateAttendanceDays() {
    const monthMap = {};

    allAttendanceData.forEach(record => {
        if (isDateInCurrentMonth(record.date)) {
            const key = record.name;
            if (!monthMap[key]) monthMap[key] = 0;
            if (record.status !== 'absent') monthMap[key]++;
        }
    });

    allAttendanceData.forEach(record => {
        record.attendanceDays = monthMap[record.name] || 0;
    });
}

function updateDashboard() {
    if (!allAttendanceData || allAttendanceData.length === 0) return;
    updateStatistics();
    updateAttendanceRates();
    updateStatusLists();
    updateTable();
    setTimeout(() => updateCharts(), 100);
}

function isDateInCurrentMonth(dateString) {
    if (!dateString || dateString === '-') return false;
    try {
        const parts = dateString.split('/');
        if (parts.length !== 3) return false;
        
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
        
        const recordDate = new Date(year, month - 1, day);
        return recordDate.getMonth() === currentMonth.getMonth() && 
               recordDate.getFullYear() === currentMonth.getFullYear();
    } catch (e) {
        return false;
    }
}

function updateStatistics() {
    const monthRecords = allAttendanceData.filter(r => isDateInCurrentMonth(r.date));
    const onTime = monthRecords.filter(r => r.status === 'on-time').length;
    const absent = monthRecords.filter(r => r.status === 'absent').length;
    const late = monthRecords.filter(r => r.status === 'late').length;

    document.getElementById('totalOnTime').textContent = onTime;
    document.getElementById('totalAbsent').textContent = absent;
    document.getElementById('totalLate').textContent = late;

    const uniqueEmployees = new Set(allAttendanceData.map(r => r.name)).size;
    document.getElementById('totalEmployees').textContent = uniqueEmployees;

    const workingDays = getWorkingDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth());
    document.getElementById('totalWorkingDays').textContent = workingDays;
}

function getWorkingDaysInMonth(year, month) {
    let count = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(year, month, i);
        if (d.getDay() !== 0 && d.getDay() !== 6) count++;
    }
    return count;
}

function updateStatusLists() {
    const monthRecords = allAttendanceData.filter(r => isDateInCurrentMonth(r.date));
    const absentPeople = new Set();
    const onTimePeople = new Set();
    const latePeople = new Set();

    monthRecords.forEach(record => {
        if (record.status === 'absent') absentPeople.add(record.name);
        else if (record.status === 'on-time') onTimePeople.add(record.name);
        else if (record.status === 'late') latePeople.add(record.name);
    });

    document.getElementById('absentCount').textContent = absentPeople.size;
    document.getElementById('ontimeCount').textContent = onTimePeople.size;
    document.getElementById('lateCount').textContent = latePeople.size;

    updateListItems('#absentList', Array.from(absentPeople).sort(), 'absent');
    updateListItems('#ontimeList', Array.from(onTimePeople).sort(), 'on-time');
    updateListItems('#lateList', Array.from(latePeople).sort(), 'late');
}

function updateListItems(selector, names, defaultFilter) {
    const list = document.querySelector(selector);
    if (names.length > 0) {
        list.innerHTML = names.map(name => `
            <div class="list-item" onclick="showDetail('${name}', '${defaultFilter}')">
                <div class="list-item-name">${name}</div>
            </div>`).join('');
    } else {
        list.innerHTML = '<div class="empty-list">ไม่มีข้อมูล</div>';
    }
}

function showDetail(employeeName, defaultFilter = '') {
    detailModalEmployeeName = employeeName;
    detailModalMonth = new Date(currentMonth);

    const filterSelect = document.getElementById('detailStatusFilter');
    if (filterSelect) filterSelect.value = defaultFilter;

    updateDetailModal();
}

function updateDetailModal() {
    currentEmployeeData = allAttendanceData
        .filter(record => record.name === detailModalEmployeeName && isDateInMonth(record.date, detailModalMonth));
    currentEmployeeData.sort((a, b) => {
        try {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateB - dateA;
        } catch (e) {
            return 0;
        }
    });

    const onTime = currentEmployeeData.filter(r => r.status === 'on-time').length;
    const late = currentEmployeeData.filter(r => r.status === 'late').length;
    const absent = currentEmployeeData.filter(r => r.status === 'absent').length;

    updateDetailMonthYearDisplay();

    let displayId = '-';
    let displayRoom = '-';
    if (currentEmployeeData.length > 0) {
        displayId = currentEmployeeData[0].studentId;
        displayRoom = currentEmployeeData[0].room;
    }

    document.getElementById('modalAvatar').textContent = detailModalEmployeeName.charAt(0);
    document.getElementById('modalTitle').textContent = detailModalEmployeeName;
    document.getElementById('modalEmployeeDetails').textContent = `รหัส: ${displayId} • ห้อง: ${displayRoom}`;

    document.getElementById('modalStats').innerHTML = `
        <div class="modal-stat-item" style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-left: 4px solid #10b981;">
            <div style="font-size: 24px; margin-bottom: 8px;">✅</div>
            <div class="modal-stat-label" style="color: #047857;">มาตรงเวลา</div>
            <div class="modal-stat-value" style="color: #064e3b;">${onTime}</div>
        </div>
        <div class="modal-stat-item" style="background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border-left: 4px solid #f59e0b;">
            <div style="font-size: 24px; margin-bottom: 8px;">⏰</div>
            <div class="modal-stat-label" style="color: #b45309;">มาสาย</div>
            <div class="modal-stat-value" style="color: #78350f;">${late}</div>
        </div>
        <div class="modal-stat-item" style="background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-left: 4px solid #ef4444;">
            <div style="font-size: 24px; margin-bottom: 8px;">✕</div>
            <div class="modal-stat-label" style="color: #b91c1c;">ขาดงาน</div>
            <div class="modal-stat-value" style="color: #7f1d1d;">${absent}</div>
        </div>
    `;

    renderDetailChart(onTime, late, absent);
    updateDetailTableOnly();
    document.getElementById('detailModal').classList.add('active');
}

function updateDetailTableOnly() {
    const filterVal = document.getElementById('detailStatusFilter').value;
    let tableData = filterVal ? currentEmployeeData.filter(r => r.status === filterVal) : currentEmployeeData;
    const tbody = document.getElementById('modalTableBody');

    if (tableData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-muted);">ไม่มีประวัติในหมวดหมู่นี้</td></tr>`;
        return;
    }

    tbody.innerHTML = tableData.map(record => `
        <tr>
            <td style="font-weight: 500;">${record.date}</td>
            <td>${record.entryTime}</td>
            <td>${record.exitTime}</td>
            <td><span class="status-badge badge-${record.status}">${getStatusLabel(record.status)}</span></td>
        </tr>`).join('');
}

function renderDetailChart(onTime, late, absent) {
    const container = document.getElementById('detailChartContainer');
    if (onTime === 0 && late === 0 && absent === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'block';
    const ctx = document.getElementById('detailChart').getContext('2d');

    if (detailChartInstance) detailChartInstance.destroy();
    detailChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['มาตรงเวลา', 'มาสาย', 'ขาดงาน'],
            datasets: [{
                data: [onTime, late, absent],
                backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
    });
}

function isDateInMonth(dateString, month) {
    if (!dateString || dateString === '-') return false;
    try {
        const parts = dateString.split('/');
        if (parts.length !== 3) return false;
        
        const day = parseInt(parts[0]);
        const d_month = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        
        if (isNaN(day) || isNaN(d_month) || isNaN(year)) return false;
        
        const recordDate = new Date(year, d_month - 1, day);
        return recordDate.getMonth() === month.getMonth() && recordDate.getFullYear() === month.getFullYear();
    } catch (e) {
        return false;
    }
}

function closeDetail() {
    document.getElementById('detailModal').classList.remove('active');
}

function updateAttendanceRates() {
    const monthRecords = allAttendanceData.filter(r => isDateInCurrentMonth(r.date));
    const totalRecords = monthRecords.length || 1;

    const onTimeCount = monthRecords.filter(r => r.status === 'on-time').length;
    const lateCount = monthRecords.filter(r => r.status === 'late').length;
    const absentCount = monthRecords.filter(r => r.status === 'absent').length;
    const presentCount = onTimeCount + lateCount;

    const avgAttendanceRate = (presentCount / totalRecords) * 100;
    document.getElementById('avgAttendancePercent').textContent = Math.round(avgAttendanceRate) + '%';
    document.getElementById('avgAttendanceBar').style.width = avgAttendanceRate + '%';

    const onTimeRate = presentCount ? (onTimeCount / presentCount) * 100 : 0;
    document.getElementById('onTimePercent').textContent = Math.round(onTimeRate) + '%';
    document.getElementById('onTimeBar').style.width = onTimeRate + '%';

    const lateRate = presentCount ? (lateCount / presentCount) * 100 : 0;
    document.getElementById('latePercent').textContent = Math.round(lateRate) + '%';
    document.getElementById('lateBar').style.width = lateRate + '%';

    const absentRate = (absentCount / totalRecords) * 100;
    document.getElementById('absentPercent').textContent = Math.round(absentRate) + '%';
    document.getElementById('absentBar').style.width = absentRate + '%';
}

function updateTable() {
    const tbody = document.getElementById('attendanceTable');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;

    let monthRecords = allAttendanceData.filter(r => isDateInCurrentMonth(r.date));

    let filtered = monthRecords.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm) || (record.studentId && record.studentId.includes(searchTerm));
        const matchesStatus = !statusFilter || record.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 40px; color: var(--text-muted);">ไม่พบข้อมูลที่ค้นหา</td></tr>`;
        return;
    }

    // เรียงจากวันที่ใหม่ไปเก่า
    filtered.sort((a, b) => {
        try {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateA - dateB;
        } catch (e) {
            return 0;
        }
    });

    tbody.innerHTML = filtered.map(record => `
        <tr onclick="showDetail('${record.name}')" style="cursor: pointer;" title="คลิกเพื่อดูรายละเอียดเชิงลึก">
            <td style="color: var(--text-muted); font-weight: 500;">${record.date}</td>
            <td style="color: var(--text-muted); font-weight: 500;">${record.studentId}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: #eff6ff; color: var(--primary-color); display: flex; align-items: center; justify-content: center; font-weight: 700;">
                        ${record.name.charAt(0)}
                    </div>
                    <div>
                        <strong style="color: var(--text-main); font-weight: 600;">${record.name}</strong>
                    </div>
                </div>
            </td>
            <td style="color: var(--text-muted);">${record.room}</td>
            <td style="font-weight: 500;">${record.entryTime}</td>
            <td style="font-weight: 500;">${record.exitTime}</td>
            <td><span class="status-badge badge-${record.status}">${getStatusLabel(record.status)}</span></td>
            <td style="color: ${record.lateTime !== '-' ? 'var(--danger-color)' : 'var(--text-muted)'}; font-size: 13px; font-weight: 500;">${record.lateTime}</td>
        </tr>`).join('');
}

function exportToCSV() {
    if (!allAttendanceData || allAttendanceData.length === 0) {
        showNotification('ไม่มีข้อมูลสำหรับนำออก', 'warning');
        return;
    }

    let csvContent = "\uFEFF";
    csvContent += "วันที่,รหัสนักศึกษา,ชื่อ-นามสกุล,ห้อง,เวลาเข้า,เวลาออก,สถานะ,เวลาสาย\n";

    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    let monthRecords = allAttendanceData.filter(r => isDateInCurrentMonth(r.date));

    let filtered = monthRecords.filter(record => {
        const matchesSearch = record.name.toLowerCase().includes(searchTerm) || (record.studentId && record.studentId.includes(searchTerm));
        const matchesStatus = !statusFilter || record.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
        try {
            const [dayA, monthA, yearA] = a.date.split('/').map(Number);
            const [dayB, monthB, yearB] = b.date.split('/').map(Number);
            const dateA = new Date(yearA, monthA - 1, dayA);
            const dateB = new Date(yearB, monthB - 1, dayB);
            return dateA - dateB;
        } catch (e) {
            return 0;
        }
    });

    filtered.forEach(record => {
        let statusTh = getStatusLabel(record.status).replace('✓ ', '').replace('⏰ ', '').replace('✕ ', '');
        let row = `"${record.date}","${record.studentId}","${record.name}","${record.room}","${record.entryTime}","${record.exitTime}","${statusTh}","${record.lateTime}"`;
        csvContent += row + "\n";
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);

    const monthText = currentMonth.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' }).replace(/\s/g, '_');
    link.setAttribute('download', `รายงานการเข้างาน_${monthText}.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('✓ นำออกไฟล์ CSV สำเร็จ', 'success');
}

function getStatusLabel(status) {
    const labels = { 'on-time': '✓ มาตรงเวลา', 'late': '⏰ มาสาย', 'absent': '✕ ขาดงาน' };
    return labels[status] || status;
}

function updateCharts() {
    const monthRecords = allAttendanceData.filter(r => isDateInCurrentMonth(r.date));
    const nameGroups = {};
    const avgTimeGroups = {};
    let onTime = 0, late = 0, absent = 0;

    monthRecords.forEach(record => {
        if (!nameGroups[record.name]) nameGroups[record.name] = 0;
        if (record.status !== 'absent') nameGroups[record.name]++;

        if (record.status !== 'absent' && record.entryTime !== '-') {
            if (!avgTimeGroups[record.name]) avgTimeGroups[record.name] = { sum: 0, count: 0 };
            const [hours, minutes] = record.entryTime.split(':').map(Number);
            avgTimeGroups[record.name].sum += hours + (minutes / 60);
            avgTimeGroups[record.name].count++;
        }

        if (record.status === 'on-time') onTime++;
        if (record.status === 'late') late++;
        if (record.status === 'absent') absent++;
    });

    // Chart 1: Attendance per person
    const ctx1 = document.getElementById('attendanceChart').getContext('2d');
    if (charts.attendance) charts.attendance.destroy();
    
    const attendanceLabels = Object.keys(nameGroups).sort();
    const attendanceData = attendanceLabels.map(name => nameGroups[name]);
    
    charts.attendance = new Chart(ctx1, {
        type: 'bar',
        data: {
            labels: attendanceLabels,
            datasets: [{
                label: 'จำนวนวันมาทำงาน',
                data: attendanceData,
                backgroundColor: [
                    '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444',
                    '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1', '#d946ef'
                ],
                borderRadius: 8,
                borderSkipped: false,
                hoverBackgroundColor: '#1e40af',
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { family: "'Prompt', sans-serif", size: 14, weight: '600' },
                        color: '#0f172a',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'rect'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold', family: "'Prompt', sans-serif" },
                    bodyFont: { size: 13, family: "'Prompt', sans-serif" },
                    borderRadius: 8,
                    caretPadding: 10,
                    callbacks: {
                        label: function(context) {
                            return 'วัน: ' + context.parsed.x + ' วัน';
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        font: { family: "'Prompt', sans-serif", size: 12 },
                        color: '#64748b'
                    },
                    grid: { drawBorder: false, color: '#e2e8f0' }
                },
                y: {
                    ticks: {
                        font: { family: "'Prompt', sans-serif", size: 13, weight: '500' },
                        color: '#0f172a'
                    },
                    grid: { display: false }
                }
            }
        }
    });

    // Chart 2: Average arrival time per person
    const averages = {};
    Object.keys(avgTimeGroups).forEach(name => {
        averages[name] = (avgTimeGroups[name].sum / avgTimeGroups[name].count).toFixed(2);
    });
    
    const timeLabels = Object.keys(averages).sort();
    const timeData = timeLabels.map(name => averages[name]);
    
    const ctx2 = document.getElementById('averageTimeChart').getContext('2d');
    if (charts.averageTime) charts.averageTime.destroy();
    charts.averageTime = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'เวลามาเฉลี่ย (ชั่วโมง)',
                data: timeData,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.08)',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#0ea5e9',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointHoverRadius: 8,
                borderWidth: 3,
                hoverBackgroundColor: 'rgba(14, 165, 233, 0.15)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: { family: "'Prompt', sans-serif", size: 14, weight: '600' },
                        color: '#0f172a',
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold', family: "'Prompt', sans-serif" },
                    bodyFont: { size: 13, family: "'Prompt', sans-serif" },
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const hours = Math.floor(context.parsed.y);
                            const mins = Math.round((context.parsed.y - hours) * 60);
                            return 'เวลา: ' + hours + ':' + (mins < 10 ? '0' : '') + mins;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    min: 6,
                    max: 18,
                    ticks: {
                        stepSize: 1,
                        font: { family: "'Prompt', sans-serif", size: 12 },
                        color: '#64748b',
                        callback: function(value) {
                            const hours = Math.floor(value);
                            const mins = Math.round((value - hours) * 60);
                            return (hours < 10 ? '0' : '') + hours + ':' + (mins < 10 ? '0' : '') + mins;
                        }
                    },
                    grid: { color: '#e2e8f0', drawBorder: false }
                },
                x: {
                    ticks: {
                        font: { family: "'Prompt', sans-serif", size: 12 },
                        color: '#64748b'
                    },
                    grid: { display: false }
                }
            }
        }
    });

    // Chart 3: Overall attendance ratio
    const totalDays = onTime + late + absent;
    const ctx3 = document.getElementById('statusChart').getContext('2d');
    if (charts.status) charts.status.destroy();
    
    const presentCount = onTime + late;
    charts.status = new Chart(ctx3, {
        type: 'doughnut',
        data: {
            labels: ['✓ มาทำงาน', '✕ ขาดงาน'],
            datasets: [{
                data: [presentCount, absent],
                backgroundColor: ['#10b981', '#ef4444'],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverBackgroundColor: ['#059669', '#dc2626']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: "'Prompt', sans-serif", size: 13, weight: '600' },
                        color: '#0f172a',
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold', family: "'Prompt', sans-serif" },
                    bodyFont: { size: 13, family: "'Prompt', sans-serif" },
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return context.label + ': ' + value + ' ครั้ง (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });

    // Chart 4: Punctuality ratio
    const ctx4 = document.getElementById('lateChart').getContext('2d');
    if (charts.late) charts.late.destroy();
    
    charts.late = new Chart(ctx4, {
        type: 'doughnut',
        data: {
            labels: ['⏱️ ตรงเวลา', '⏰ มาสาย'],
            datasets: [{
                data: [onTime, late],
                backgroundColor: ['#10b981', '#f59e0b'],
                borderColor: '#ffffff',
                borderWidth: 3,
                hoverBackgroundColor: ['#059669', '#d97706']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { family: "'Prompt', sans-serif", size: 13, weight: '600' },
                        color: '#0f172a',
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    titleFont: { size: 14, weight: 'bold', family: "'Prompt', sans-serif" },
                    bodyFont: { size: 13, family: "'Prompt', sans-serif" },
                    borderRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            if (total === 0) return 'ไม่มีข้อมูล';
                            const value = context.parsed;
                            const percentage = ((value / total) * 100).toFixed(1);
                            return context.label + ': ' + value + ' ครั้ง (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

function setupTabNavigation() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

function showStatusFilter(type) {
    document.getElementById('searchInput').value = '';
    document.getElementById('statusFilter').value = type;
    updateTable();
}

function setupEventListeners() {
    let searchTimeout;
    const searchEl = document.getElementById('searchInput');
    if (searchEl) {
        searchEl.addEventListener('input', function() {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => updateTable(), 300);
        });
    }
    const statusEl = document.getElementById('statusFilter');
    if (statusEl) statusEl.addEventListener('change', updateTable);
    const detailModalEl = document.getElementById('detailModal');
    if (detailModalEl) detailModalEl.addEventListener('click', function (e) { if (e.target === this) closeDetail(); });
}

async function refreshData() {
    if (isLoadingData) {
        showNotification('⏳ กำลังดึงข้อมูลอยู่...');
        return;
    }

    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.style.opacity = '0.5';
        refreshBtn.style.pointerEvents = 'none';
        const svg = refreshBtn.querySelector('.icon svg');
        if (svg) svg.style.animation = 'spin 1s linear infinite';
    }

    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_EXPIRY_KEY);

    await loadAttendanceData();

    if (refreshBtn) {
        refreshBtn.style.opacity = '1';
        refreshBtn.style.pointerEvents = 'auto';
        const svg = refreshBtn.querySelector('.icon svg');
        if (svg) svg.style.animation = 'none';
        showNotification('✓ รีเฟรชข้อมูลสำเร็จ', 'success');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
        color: white; padding: 12px 20px; border-radius: 8px; font-size: 14px; font-weight: 500;
        z-index: 9999; opacity: 0; animation: slideIn 0.3s ease-out forwards;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.animation = 'slideOut 0.3s ease-out forwards'; setTimeout(() => notification.remove(), 300); }, 3000);
}

let miniCalendarYear = currentMonth.getFullYear();

function toggleMiniCalendar() {
    const cal = document.getElementById('miniCalendar');
    if (!cal) return;
    cal.classList.toggle('active');
    if (cal.classList.contains('active')) {
        miniCalendarYear = currentMonth.getFullYear();
        renderMiniCalendar();
    }
}

function changeMiniYear(dir) { miniCalendarYear += dir; renderMiniCalendar(); }

function renderMiniCalendar() {
    const yearEl = document.getElementById('miniYearDisplay');
    if (yearEl) yearEl.textContent = miniCalendarYear + 543;
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const grid = document.getElementById('miniMonthGrid');
    if (!grid) return;
    grid.innerHTML = monthNames.map((m, i) => {
        const isActive = (i === currentMonth.getMonth() && miniCalendarYear === currentMonth.getFullYear());
        return `<button class="mini-month-btn ${isActive ? 'active' : ''}" onclick="selectMiniMonth(${i})">${m}</button>`;
    }).join('');
}

function selectMiniMonth(monthIndex) { currentMonth.setFullYear(miniCalendarYear); currentMonth.setMonth(monthIndex); updateMonthDisplay(); const cal = document.getElementById('miniCalendar'); if (cal) cal.classList.remove('active'); }

document.addEventListener('click', function (e) {
    const mainDisplay = document.getElementById('monthDisplay');
    const mainCal = document.getElementById('miniCalendar');
    if (mainCal && mainCal.classList.contains('active') && e.target !== mainDisplay && !mainCal.contains(e.target)) {
        mainCal.classList.remove('active');
    }
});
