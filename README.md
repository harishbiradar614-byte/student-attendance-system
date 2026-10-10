# Smart Student Attendance System by Face Scanning

**Major Academic Project | Academic Year 2025–2026**  
**Institution:** Sharnbasava University, Kalaburagi, Karnataka, India  
**Faculty:** Faculty of Engineering & Technology  
**Department:** Department of Computer Science & Engineering  

## 👥 Project Team Members
- **Harish Biradar** (USN: SG25CSE050) — Team Member • Core Algorithmic Lead
- **Kartik V** (USN: SG25CSE057) — Team Member • Biometric Slicing & DB Lead
- **Adarsh R Patil** (USN: SG25CSE007) — Team Member • UI/UX & Live Scanner Architect
- **Akash S Patil** (USN: SG25CSE016) — Team Member • Security, Testing & Anti-Proxy QA

---

## 📋 Features Overview

1. **Sequential Period Management (No Clocks / Timers)**:
   - Tracks **Period 1**, **Period 2**, **Short Break (15 mins)**, **Period 3**, **Lunch Break (1 Hour)**, **Period 4**, **Period 5**.
   - Clicking **"Next Period ➔"** automatically updates the subject and assigned faculty name.
   - Attendance scanner is paused during Short Break and Lunch Break.

2. **Settings Modal (⚙️)**:
   - Configure/modify faculty names and subjects for any period.
   - Clear attendance or start fresh.

3. **Active/Inactive Camera State**:
   - When the camera is **OFF**, the scanner is completely inactive and scanning is blocked.
   - When the camera is **ON**, the video stream, biometric HUD, and face scanner activate.

4. **Empty Initial Student Database & Pure Camera Enrollment**:
   - The system starts with **zero students** enrolled.
   - Click **➕ Add Student**: Look into the camera, click **"📸 Capture Face"**, enter student details, and save. No file upload or image chooser needed.
   - Option to **Delete Student** (🗑️) at any time.

5. **Accurate Facial Recognition & Anti-Proxy Duplicate Prevention**:
   - Live face frames are compared against enrolled students.
   - **Unknown / Non-Enrolled Face**: Alerts: `❌ FACE NOT SAVED IN DATABASE! Please register student first.`
   - **Enrolled Face (First Scan)**: Marks `✅ VERIFIED PRESENT` with timestamp.
   - **Duplicate Scan**: If the same face is scanned again in that period, it alerts: `⚠️ FACE ALREADY SCANNED! [Name] was ALREADY marked PRESENT for this period!`

---

## 🚀 How to Run & Deploy

### Option 1: Drag & Drop into GitHub Pages
Upload `index.html`, `logo.png`, `styles.css`, and `app.js` into your GitHub repository and enable Pages on branch `main`.

### Option 2: Run Locally via Python
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080` in your web browser.
