// API Configuration for Attendance System
const GAS_API_URL = localStorage.getItem('gas_url') ||
 'https://script.google.com/macros/s/AKfycbxkthm6Kmq61oSckBHv6wGerL2bdgvn-k1yTWbrqOjeSlcjwgV3JEjoOhq3i8933YRS1w/exec';

// API Functions
class AttendanceAPI {
    constructor() {
        this.baseURL = GAS_API_URL;
    }

    // ส่งข้อมูลการเช็คชื่อ
    async submitAttendance(data) {
        const params = new URLSearchParams({
            action: 'submit_attendance',
            id: data.id,
            name: data.name,
            room: data.room,
            timestamp: data.timestamp,
            status: data.status,
            lat: data.lat,
            lng: data.lng
        });

        const response = await fetch(`${this.baseURL}?${params}`);
        return await response.json();
    }

    // ตรวจสอบนักศึกษา (สำหรับ login)
    async verifyStudent(id, name) {
        const params = new URLSearchParams({
            action: 'verify_student',
            id: id,
            name: name
        });

        const response = await fetch(`${this.baseURL}?${params}`);
        return await response.json();
    }

    // โหลดข้อมูลแดชบอร์ด
    async getDashboardData(month, year) {
        const params = new URLSearchParams({
            action: 'get_dashboard',
            month: month,
            year: year
        });

        const response = await fetch(`${this.baseURL}?${params}`);
        return await response.json();
    }

    // เพิ่มนักศึกษาใหม่ (สำหรับ admin)
    async addStudent(studentData) {
        const params = new URLSearchParams({
            action: 'add_student',
            ...studentData
        });

        const response = await fetch(`${this.baseURL}?${params}`);
        return await response.json();
    }
}

// สร้าง instance ของ API
const attendanceAPI = new AttendanceAPI();

// Config Functions
function getConfig() {
    return {
        gasUrl: localStorage.getItem('gas_url') || GAS_API_URL,
        defaultRoom: localStorage.getItem('default_room') || '1-0308',
        startTime: localStorage.getItem('start_time') || '08:00',
        closeTime: localStorage.getItem('close_time') || '09:00',
    };
}

function saveConfig(config) {
    Object.keys(config).forEach(key => {
        localStorage.setItem(key, config[key]);
    });
}