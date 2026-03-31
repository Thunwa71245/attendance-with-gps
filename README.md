# attendance-with-gps📌 QR Code Attendance System

ระบบเช็คชื่อฝึกงานด้วย QR Code + GPS + Google Sheets

โปรเจคนี้เป็น Web Application สำหรับใช้ตรวจสอบเวลาเข้าเรียนหรือเข้างานของนักศึกษา โดยผู้ใช้งานสามารถสแกน QR Code ภายในพื้นที่ที่กำหนด แล้วกรอกข้อมูลเพื่อเช็คชื่อ ระบบจะบันทึกข้อมูลลง Google Sheets อัตโนมัติ พร้อมคำนวณสถานะการมาทำงาน

ระบบถูกออกแบบให้มีโครงสร้างเรียบง่าย ใช้งานง่าย และสามารถขยายระบบได้ในอนาคต

✨ Features

    📷 สแกน QR Code เพื่อเช็คชื่อ

    📍 ตรวจสอบตำแหน่ง GPS เพื่อป้องกันการเช็คชื่อจากนอกพื้นที่

    📊 บันทึกข้อมูลลง Google Sheets อัตโนมัติ

    ⏰ คำนวณสถานะการมาทำงาน

    🚫 ป้องกันการเช็คชื่อซ้ำในวันเดียวกัน

    🏫 รองรับหลายห้องในอนาคต

    🌐 Web Application ใช้งานผ่านมือถือได้ทันที

🏗 System Architecture
User
   │
   ▼
QR Code Scan (Camera)
   │
   ▼
Web Application (Netlify)
   │
   ▼
Fetch API
   │
   ▼
Google Apps Script
   │
   ▼
Google Sheets (Database)
🧰 Technology Stack
Frontend

HTML

CSS

JavaScript

html5-qrcode

Backend

Google Apps Script

Database

Google Sheets

Deployment

Netlify

📁 Project Structure
qr-attendance-system
│
├── index.html
├── scan.html
├── api-config.js
├── README.md
│
└── assets
📊 Google Sheet Structure

Sheet Name

attendance

Columns

Column	Description
Time	วันที่และเวลาที่เช็คชื่อ
StudentID	รหัสนักศึกษา
Name	ชื่อนักศึกษา
Room	ห้องที่เช็คชื่อ
Status	ปกติ / สาย
LateTime	เวลาที่มาสาย
🔳 QR Code Format

QR Code จะมีข้อมูลเป็น URL

scan.html?room=1-0308

ตัวอย่าง

https://your-domain.netlify.app/scan.html?room=1-0308

เมื่อผู้ใช้สแกน QR Code ระบบจะเปิดหน้า Scan พร้อมกำหนดห้องให้โดยอัตโนมัติ

📍 Location Verification

ระบบตรวจสอบตำแหน่ง GPS ของผู้ใช้งาน

ค่าที่ใช้ในระบบ

const ROOM_LAT = 13.901234
const ROOM_LNG = 100.532456
const MAX_DISTANCE = 50

หากผู้ใช้อยู่ไกลกว่าระยะที่กำหนด ระบบจะไม่อนุญาตให้เช็คชื่อ

⏰ Check-in Logic

เวลาทำงานของนักศึกษาฝึกงาน

Start Time : 08:00

เงื่อนไข

เวลา	Status
ก่อน 08:00	ปกติ
หลัง 08:00	สาย

ตัวอย่าง

LateTime : 0h 15m
🚫 Duplicate Prevention

ระบบจะตรวจสอบว่า Student ID เดิมได้เช็คชื่อในวันเดียวกันแล้วหรือไม่

หากเช็คชื่อไปแล้ว

ระบบจะไม่อนุญาตให้เช็คชื่อซ้ำ
🔗 API Documentation
Endpoint
POST /exec
Request Body
{
  "student_id": "6452300237",
  "name": "Student Name",
  "room": "1-0308"
}
Response
{
  "status": "success"
}
⚙️ Configuration

ไฟล์

api-config.js

ใช้กำหนด URL ของ Google Apps Script

const GAS_API_URL = "YOUR_GOOGLE_SCRIPT_WEBAPP_URL"
🚀 Deployment
Frontend

Deploy ผ่าน

Netlify
Backend

ใช้

Google Apps Script
Database

ใช้

Google Sheets
🛠 Setup Guide
1️⃣ Deploy Google Apps Script

เปิด Google Apps Script แล้ว Deploy เป็น Web App

ตั้งค่า

Execute as : Me
Who has access : Anyone
2️⃣ Create Google Sheet

สร้าง Sheet ชื่อ

attendance

เพิ่ม Columns

Time | StudentID | Name | Room | Status | LateTime
3️⃣ Deploy Frontend

Upload project ไปที่

Netlify
4️⃣ Generate QR Code

สร้าง QR Code สำหรับแต่ละห้อง

ตัวอย่าง

https://your-domain.netlify.app/scan.html?room=1-0308

แล้วนำไปติดไว้หน้าห้อง

🔒 Security Considerations

GPS verification prevents remote check-in

Duplicate prevention avoids multiple submissions

QR Code location-based validation

🚀 Future Improvements

Check-out system (17:00)

Attendance Dashboard

Multi-room support

Admin Panel

Export Attendance Report

Dynamic QR Code Security

👨‍💻 Author

Developed by

Saleebut Eiamsa-ad

Computer Engineering