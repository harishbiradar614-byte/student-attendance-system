# ==============================================================================
# Institution: Sharnbasava University, Kalaburagi
# Faculty of Engineering & Technology | Department of Computer Science & Engineering
#
# Project Title: Smart Student Attendance System by Face Scanning (Periods & Camera HUD)
# Description: Automated Biometric Facial Recognition Attendance System
#
# Team Members:
#   - Harish Biradar (USN: SG25CSE050)
#   - Kartik V       (USN: SG25CSE057)
#   - Adarsh R Patil (USN: SG25CSE007)
#   - Akash S Patil  (USN: SG25CSE016)
# ==============================================================================

import os
import sys
import json
import sqlite3
import csv
from datetime import datetime

DB_FILE = os.environ.get("ATTENDANCE_DB_FILE", "/tmp/student_attendance_v2.db")
PORT = 8080

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS students (
            usn TEXT PRIMARY KEY,
            name TEXT,
            semester INTEGER,
            section TEXT,
            department TEXT,
            registered_at TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS periods (
            period_id TEXT PRIMARY KEY,
            name TEXT,
            period_type TEXT,
            subject TEXT,
            faculty TEXT
        )
    """)
    c.execute("""
        CREATE TABLE IF NOT EXISTS attendance_records (
            record_id INTEGER PRIMARY KEY AUTOINCREMENT,
            period_id TEXT,
            usn TEXT,
            status TEXT,
            scan_time TEXT,
            confidence_score REAL,
            FOREIGN KEY (period_id) REFERENCES periods(period_id),
            FOREIGN KEY (usn) REFERENCES students(usn)
        )
    """)
    
    # Initialize standard periods (including breaks)
    periods_data = [
        ("P1", "Period 1", "class", "Data Structures & Algorithms", "Prof. Raghavendra Joshi"),
        ("P2", "Period 2", "class", "Operating Systems", "Dr. Sharanabasappa"),
        ("SB", "Short Break", "break", "Short Break (15 mins)", "Attendance Paused"),
        ("P3", "Period 3", "class", "Database Management Systems", "Prof. Anand Patil"),
        ("LB", "Lunch Break", "break", "Lunch Break (1 Hour)", "Attendance Paused"),
        ("P4", "Period 4", "class", "Computer Networks", "Prof. K. Rao"),
        ("P5", "Period 5", "class", "Discrete Mathematics", "Dr. M. S. Biradar")
    ]
    for p in periods_data:
        c.execute("INSERT OR IGNORE INTO periods VALUES (?, ?, ?, ?, ?)", p)
        
    conn.commit()
    conn.close()

def record_face_scan(period_id, usn, confidence=98.5):
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    
    # Check if student exists
    c.execute("SELECT name FROM students WHERE usn = ?", (usn,))
    res = c.fetchone()
    if not res:
        conn.close()
        return False, f"❌ FACE NOT SAVED IN DATABASE: Student USN {usn} is not registered."
        
    student_name = res[0]
    
    # Check if already scanned in this period
    c.execute("SELECT scan_time FROM attendance_records WHERE period_id = ? AND usn = ?", (period_id, usn))
    prev = c.fetchone()
    if prev:
        conn.close()
        return False, f"⚠️ FACE ALREADY SCANNED: {student_name} ({usn}) was ALREADY marked PRESENT at {prev[0]} for this period!"
        
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    c.execute("INSERT INTO attendance_records (period_id, usn, status, scan_time, confidence_score) VALUES (?, ?, 'PRESENT', ?, ?)",
              (period_id, usn, now, confidence))
    conn.commit()
    conn.close()
    return True, f"✅ Attendance Marked: {student_name} ({usn}) is PRESENT at {now}."

def print_banner():
    print("=" * 80)
    print("  SHARNBASAVA UNIVERSITY, KALABURAGI")
    print("  Faculty of Engineering & Technology | Department of Computer Science & Engg.")
    print("  PROJECT: SMART STUDENT ATTENDANCE SYSTEM BY FACE SCANNING")
    print("  Team Members:")
    print("    - Harish Biradar (USN: SG25CSE050)")
    print("    - Kartik V       (USN: SG25CSE057)")
    print("    - Adarsh R Patil (USN: SG25CSE007)")
    print("    - Akash S Patil  (USN: SG25CSE016)")
    print("=" * 80)

def main():
    init_db()
    print_banner()
    print("\nBackend database initialized. Web interface is ready.")
    print("Run local web server with: python3 -m http.server 8080")

if __name__ == "__main__":
    main()
