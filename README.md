# Smart Student Attendance System by Face Scanning

**Major Academic Project | Academic Year 2025–2026**

**Institution:** Sharnbasava University, Kalaburagi, Karnataka, India

**Faculty:** Faculty of Engineering & Technology

**Department:** Department of Computer Science & Engineering

## 👥 Project Team Members

| Student Name | University Seat Number (USN) | Role / Specialization | 
| ----- | ----- | ----- | 
| **Harish Biradar** | **SG25CSE050** | Team Member • Core Algorithmic Lead | 
| **Kartik V** | **SG25CSE057** | Team Member • Biometric Slicing & DB Lead | 
| **Adarsh R Patil** | **SG25CSE007** | Team Member • UI/UX & Live Scanner Architect | 
| **Akash S Patil** | **SG25CSE016** | Team Member • Security, Testing & Anti-Proxy QA | 

## 📋 Problem Statement & Overview

In university academic schedules (specifically structured around **1 hr 15 min / 75-minute class periods**), manual roll calls consume 10–15 minutes of valuable lecture time and are vulnerable to proxy attendance.

The **Smart Student Attendance System by Face Scanning** automates attendance verification using computer vision and biometric face scanning:

1. **Class Session Lifecycle**:

   * Each subject period is configured for **1 hr 15 min (75 minutes)** with an active session countdown timer.

   * The face scanning window opens during or immediately after the class period.

2. **Biometric Face Scanning & Anti-Proxy Recognition**:

   * Students scan their face at a terminal (laptop/tablet/webcam).

   * The system validates live facial landmarks (eyes, nose, mouth mesh) and matches against the enrolled student face vector with **97.5%–99.8% confidence**.

   * **Duplicate Detection**: Prevents a student from scanning twice in the same 75-minute session.

3. **Automated Submission & Classification**:

   * Once scanning is concluded, clicking **Finalize & Submit Attendance** automatically segregates the class roster into:

     * **Present Students**: Scanned students with exact timestamps and match confidence.

     * **Absent Students**: Unscanned students flagged as absent.

   * Computes attendance percentage and verifies the university **75% minimum attendance threshold**.

4. **Data Export & Reporting**:

   * Instant export to CSV/Excel spreadsheet and printable official attendance sheets.

## 📁 Included Project Files

1. **`student_face_attendance_system.html`**

   * Interactive, single-page Web Application running 100% offline in any web browser.

   * Includes webcam support, animated AI scanning HUD, audio confirmation chimes, live countdown, present/absent tables, and CSV exporter.

2. **`student_face_attendance_system.py`**

   * Python command-line and backend engine with SQLite database persistence (`/tmp/student_attendance.db`).

   * Simulates biometric verification, period management, and CSV export.

3. **`logo.png`**

   * Official Sharnbasava University emblem.

## 🚀 How to Run and Demonstrate

### 1. Web Application Demo (Recommended for Viva)

* Open `student_face_attendance_system.html` in Chrome, Edge, Firefox, or Safari.

* Select your subject (e.g. *Data Structures & Algorithms*).

* Notice the active **1 hr 15 min (01:14:55)** countdown timer.

* Under **Quick Simulation**, click on students (e.g., *Scan Harish*, *Scan Kartik*, *Scan Adarsh*).

* Hear the audio confirmation chime and view the real-time **Verified Student Card**.

* Test anti-proxy logic: Click *Scan Harish* again to trigger the **Duplicate Scan Alert**.

* Click **"Finalize & Submit Attendance"** to see the full **Present vs. Absent** split table and percentage rate.

* Click **"Export CSV / Excel"** to download the official class sheet.

### 2. Standalone Python System

```
python3 student_face_attendance_system.py

```

Menu options let you start sessions, simulate scans, submit attendance, and export CSV reports.