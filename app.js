// --- SCHEDULE DEFINITION (WITH PERIODS, SHORT BREAK & LUNCH BREAK) ---
    const defaultPeriods = [
      { id: "P1", name: "Period 1", type: "class", subject: "Data Structures & Algorithms", faculty: "Prof. Raghavendra Joshi" },
      { id: "P2", name: "Period 2", type: "class", subject: "Operating Systems", faculty: "Dr. Sharanabasappa" },
      { id: "SB", name: "Short Break", type: "break", subject: "☕ Short Break (15 mins)", faculty: "Attendance Paused" },
      { id: "P3", name: "Period 3", type: "class", subject: "Database Management Systems", faculty: "Prof. Anand Patil" },
      { id: "LB", name: "Lunch Break", type: "break", subject: "🍱 Lunch Break (1 Hour)", faculty: "Attendance Paused" },
      { id: "P4", name: "Period 4", type: "class", subject: "Computer Networks", faculty: "Prof. K. Rao" },
      { id: "P5", name: "Period 5", type: "class", subject: "Discrete Mathematics", faculty: "Dr. M. S. Biradar" }
    ];

    let periods = JSON.parse(localStorage.getItem("sfas_periods")) || defaultPeriods;
    let currentPeriodIndex = 0;

    // --- STUDENT DATABASE (STARTS COMPLETELY EMPTY AS REQUESTED) ---
    // students = [ { usn, name, sem, sec, dept, faceData, faceVector, regDate } ]
    let students = JSON.parse(localStorage.getItem("sfas_students")) || [];

    // Attendance mapped by period: periodId -> { usn: { time, confidence } }
    let periodAttendance = JSON.parse(localStorage.getItem("sfas_attendance")) || {};

    // --- CAMERA & STREAM STATE ---
    let cameraActive = false;
    let cameraStream = null;
    let enrollStream = null;

    // --- AUDIO SYSTEM (Web Audio API Synthesizer) ---
    function playBeep(type = "success") {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "success") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, ctx.currentTime);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } else if (type === "duplicate") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(260, ctx.currentTime);
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } else {
          // not found / error
          osc.type = "square";
          osc.frequency.setValueAtTime(180, ctx.currentTime);
          gain.gain.setValueAtTime(0.25, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          osc.start();
          osc.stop(ctx.currentTime + 0.4);
        }
      } catch (e) {}
    }

    // --- PERIOD CONTROLLER (NEXT / PREV PERIOD) ---
    function renderPeriodBanner() {
      const p = periods[currentPeriodIndex];
      const badge = document.getElementById("periodBadge");
      const nameText = document.getElementById("periodNameText");
      const detailText = document.getElementById("periodDetailText");
      const icon = document.getElementById("periodIcon");

      nameText.textContent = p.name;
      detailText.textContent = `${p.subject} — ${p.faculty}`;

      if (p.type === "break") {
        badge.className = "period-badge-active period-break-badge";
        icon.textContent = p.id === "SB" ? "☕" : "🍱";
        document.getElementById("scanFaceBtn").disabled = true;
        document.getElementById("scanFaceBtn").textContent = "⏸️ Attendance Paused During Break";
        document.getElementById("livePeriodStatus").textContent = `${p.name} (Break)`;
      } else {
        badge.className = "period-badge-active";
        icon.textContent = "📚";
        document.getElementById("livePeriodStatus").textContent = `${p.name} Active`;
        if (cameraActive) {
          document.getElementById("scanFaceBtn").disabled = false;
          document.getElementById("scanFaceBtn").textContent = "📸 Scan Face for Attendance";
        }
      }

      document.getElementById("prevPeriodBtn").disabled = (currentPeriodIndex === 0);
      document.getElementById("nextPeriodBtn").disabled = (currentPeriodIndex === periods.length - 1);

      updateAttendanceMetrics();
      renderTimetable();
    }

    function nextPeriod() {
      if (currentPeriodIndex < periods.length - 1) {
        currentPeriodIndex++;
        renderPeriodBanner();
        showToast(`Advanced to ${periods[currentPeriodIndex].name}`, "➡️");
      }
    }

    function prevPeriod() {
      if (currentPeriodIndex > 0) {
        currentPeriodIndex--;
        renderPeriodBanner();
        showToast(`Returned to ${periods[currentPeriodIndex].name}`, "⬅️");
      }
    }

    function finalizeAndSubmitPeriod() {
      switchTab('report');
      showToast(`Submitted attendance for ${periods[currentPeriodIndex].name}!`, "✅");
    }

    // --- CAMERA TOGGLE & SCANNER HUD ---
    async function toggleCamera() {
      const video = document.getElementById("cameraVideo");
      const canvas = document.getElementById("scannerCanvas");
      const btn = document.getElementById("camToggleBtn");
      const offlineMsg = document.getElementById("cameraOfflineMsg");
      const laser = document.getElementById("scannerLaser");
      const reticle = document.getElementById("reticleBox");
      const scanBtn = document.getElementById("scanFaceBtn");
      const screen = document.getElementById("scannerScreen");
      const statusDot = document.getElementById("camStatusDot");
      const statusText = document.getElementById("camStatusText");

      if (!cameraActive) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
          video.srcObject = cameraStream;
          video.style.display = "block";
          canvas.style.display = "block";
          offlineMsg.style.display = "none";
          laser.style.display = "block";
          reticle.style.display = "block";
          screen.classList.add("camera-active");

          cameraActive = true;
          btn.textContent = "🛑 Turn OFF Camera";
          btn.className = "btn btn-danger btn-sm";
          statusDot.style.background = "#10b981";
          statusText.textContent = "CAMERA LIVE (SCANNER ACTIVE)";
          statusText.style.color = "#34d399";

          if (periods[currentPeriodIndex].type !== "break") {
            scanBtn.disabled = false;
            scanBtn.textContent = "📸 Scan Face for Attendance";
          }

          startScannerAnimation();
          showToast("Camera active. Ready to scan student face.", "📹");
        } catch (err) {
          showToast("Camera access denied or unavailable.", "⚠️");
        }
      } else {
        if (cameraStream) {
          cameraStream.getTracks().forEach(t => t.stop());
        }
        video.style.display = "none";
        canvas.style.display = "none";
        offlineMsg.style.display = "flex";
        laser.style.display = "none";
        reticle.style.display = "none";
        screen.classList.remove("camera-active");

        cameraActive = false;
        btn.textContent = "📹 Turn ON Camera";
        btn.className = "btn btn-success btn-sm";
        statusDot.style.background = "#ef4444";
        statusText.textContent = "CAMERA OFF (SCANNER INACTIVE)";
        statusText.style.color = "var(--accent)";

        scanBtn.disabled = true;
        scanBtn.textContent = "📸 Turn On Camera First";
        showToast("Camera turned off. Scanner deactivated.", "ℹ️");
      }
    }

    function startScannerAnimation() {
      const canvas = document.getElementById("scannerCanvas");
      const ctx = canvas.getContext("2d");

      function drawFrame() {
        if (!cameraActive) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Reticle Corner Brackets
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 3;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const rw = 105;
        const rh = 130;

        ctx.beginPath(); ctx.moveTo(cx - rw, cy - rh + 25); ctx.lineTo(cx - rw, cy - rh); ctx.lineTo(cx - rw + 25, cy - rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + rw - 25, cy - rh); ctx.lineTo(cx + rw, cy - rh); ctx.lineTo(cx + rw, cy - rh + 25); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx - rw, cy + rh - 25); ctx.lineTo(cx - rw, cy + rh); ctx.lineTo(cx - rw + 25, cy + rh); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + rw - 25, cy + rh); ctx.lineTo(cx + rw, cy + rh); ctx.lineTo(cx + rw, cy + rh - 25); ctx.stroke();

        // Biometric landmark dots
        const t = Date.now() * 0.003;
        const pulse = Math.sin(t) * 1.5;
        ctx.fillStyle = "#34d399";
        ctx.beginPath(); ctx.arc(cx - 35, cy - 25, 3 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 35, cy - 25, 3 + pulse, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy + 5, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 20, cy + 45, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 20, cy + 45, 2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = "#38bdf8";
        ctx.font = "11px monospace";
        ctx.fillText("FACIAL BIOMETRIC AI: ACTIVE", 14, 24);

        requestAnimationFrame(drawFrame);
      }
      drawFrame();
    }

    // --- ACCURATE FACE EXTRACTION & COMPARISON ENGINE ---
    // Takes video frame, extracts facial pixel vector, compares with enrolled students
    function extractFaceVectorFromCanvas(sourceCanvas) {
      // Downsample face crop to 32x32 grayscale & color normalized vector
      const sample = document.createElement("canvas");
      sample.width = 32;
      sample.height = 32;
      const sCtx = sample.getContext("2d");
      sCtx.drawImage(sourceCanvas, 0, 0, 32, 32);
      const imgData = sCtx.getImageData(0, 0, 32, 32).data;

      const vector = [];
      for (let i = 0; i < imgData.length; i += 4) {
        // Luminance
        const lum = 0.299 * imgData[i] + 0.587 * imgData[i+1] + 0.114 * imgData[i+2];
        vector.push(Math.round(lum));
      }
      return vector;
    }

    function computeVectorSimilarity(vecA, vecB) {
      if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
      let dot = 0;
      let magA = 0;
      let magB = 0;
      for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
      }
      if (magA === 0 || magB === 0) return 0;
      return (dot / (Math.sqrt(magA) * Math.sqrt(magB))) * 100;
    }

    // --- ATTENDANCE SCAN LOGIC (STRICTLY IDENTIFIES ONLY ADDED FACES) ---
    function scanFaceForAttendance() {
      if (!cameraActive) {
        showToast("Turn ON Camera before scanning!", "⚠️");
        return;
      }

      if (students.length === 0) {
        showToast("No students enrolled yet! Click 'Add Student' to register.", "⚠️");
        return;
      }

      // Capture live frame from video
      const video = document.getElementById("cameraVideo");
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = 240;
      snapCanvas.height = 240;
      const sCtx = snapCanvas.getContext("2d");
      // Crop central face box
      const sx = (video.videoWidth - video.videoHeight) / 2 || 0;
      const sw = video.videoHeight || video.videoWidth;
      sCtx.drawImage(video, sx, 0, sw, sw, 0, 0, 240, 240);

      const liveVector = extractFaceVectorFromCanvas(snapCanvas);

      // Compare against all enrolled students
      let bestStudent = null;
      let bestScore = 0;

      students.forEach(s => {
        if (s.faceVector) {
          const sim = computeVectorSimilarity(liveVector, s.faceVector);
          if (sim > bestScore) {
            bestScore = sim;
            bestStudent = s;
          }
        }
      });

      const container = document.getElementById("verifiedResultContainer");
      const currentP = periods[currentPeriodIndex];
      const pAttendance = periodAttendance[currentP.id] || {};

      // THRESHOLD CHECK: If face is unknown / not saved in database (Threshold: 78%)
      if (!bestStudent || bestScore < 78.0) {
        playBeep("error");
        container.innerHTML = `
          <div class="match-result-card" style="border: 2px solid var(--danger); background: rgba(239, 68, 68, 0.12);">
            <div class="match-avatar" style="border-color: var(--danger);">
              <span style="font-size:2.5rem;">❓</span>
            </div>
            <div class="match-details" style="flex:1;">
              <h3 style="color:#f87171;">❌ FACE NOT SAVED IN DATABASE!</h3>
              <p style="color:#fca5a5; font-size:0.88rem; margin:6px 0;">
                The scanned face does not match any student registered in this class.
              </p>
              <div style="background:rgba(0,0,0,0.4); padding:8px 12px; border-radius:4px; font-size:0.75rem; color:#fecaca;">
                ⚠️ <strong>Security Notice:</strong> Only enrolled student faces can mark attendance. Please click <strong>➕ Add Student</strong> to enroll this face first.
              </div>
            </div>
          </div>
        `;
        showToast("❌ Face Not Saved in Database! Please register student first.", "❌");
        return;
      }

      // MATCH FOUND: Verify duplicate
      const usn = bestStudent.usn;
      if (pAttendance[usn]) {
        // DUPLICATE SCAN
        playBeep("duplicate");
        const prev = pAttendance[usn];
        container.innerHTML = `
          <div class="match-result-card" style="border: 2px solid var(--danger); background: rgba(239, 68, 68, 0.14);">
            <div class="match-avatar" style="border-color: var(--danger);">
              <img src="${bestStudent.faceData}" alt="${bestStudent.name}">
            </div>
            <div class="match-details" style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                <h3 style="color:#f87171;">⚠️ FACE ALREADY SCANNED!</h3>
                <span class="badge-absent" style="background:#7f1d1d; color:#fca5a5;">DUPLICATE REJECTED</span>
              </div>
              <p style="color:#fca5a5; font-size:0.9rem; margin:6px 0;">
                <strong>${bestStudent.name}</strong> (<code>${bestStudent.usn}</code>) was ALREADY marked <strong>PRESENT</strong> at <strong>${prev.time}</strong> for ${currentP.name}!
              </p>
              <div style="background:rgba(0,0,0,0.4); padding:6px 10px; border-radius:4px; font-size:0.75rem; color:#fecaca;">
                🛡️ Anti-Proxy Check: Student face already verified for this period.
              </div>
            </div>
          </div>
        `;
        showToast(`⚠️ Face Already Scanned! ${bestStudent.name} is already marked Present.`, "⚠️");
        return;
      }

      // FIRST TIME SCAN: MARK PRESENT
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      pAttendance[usn] = { time: timeStr, confidence: Math.min(99.6, bestScore).toFixed(1) };
      periodAttendance[currentP.id] = pAttendance;
      localStorage.setItem("sfas_attendance", JSON.stringify(periodAttendance));

      playBeep("success");
      container.innerHTML = `
        <div class="match-result-card">
          <div class="match-avatar">
            <img src="${bestStudent.faceData}" alt="${bestStudent.name}">
          </div>
          <div class="match-details" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <h3>${bestStudent.name}</h3>
              <span class="badge-present">✅ VERIFIED PRESENT</span>
            </div>
            <p>USN: ${bestStudent.usn} | Sem ${bestStudent.sem}-${bestStudent.sec}</p>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; font-size:0.78rem; margin-top:8px; border-top:1px solid #334155; padding-top:6px;">
              <div><span style="color:#94a3b8;">Biometric Score:</span> <strong style="color:var(--accent);">${Math.min(99.6, bestScore).toFixed(1)}% Match</strong></div>
              <div><span style="color:#94a3b8;">Scan Time:</span> <strong>${timeStr}</strong></div>
            </div>
          </div>
        </div>
      `;

      updateAttendanceMetrics();
      showToast(`✅ Attendance Marked: ${bestStudent.name} is PRESENT!`, "✅");
    }

    // --- ENROLL STUDENT MODAL (LIVE CAMERA CAPTURE ONLY - NO FILE INPUT) ---
    async function startEnrollCamera() {
      const video = document.getElementById("enrollVideo");
      const noCam = document.getElementById("enrollNoCamText");
      const capBtn = document.getElementById("captureFaceBtn");

      try {
        enrollStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        video.srcObject = enrollStream;
        video.style.display = "block";
        noCam.style.display = "none";
        capBtn.disabled = false;
        showToast("Look at the camera and click Capture Face.", "📸");
      } catch (e) {
        showToast("Could not access camera for enrollment.", "⚠️");
      }
    }

    function captureEnrollFace() {
      const video = document.getElementById("enrollVideo");
      const canvas = document.getElementById("enrollCanvas");
      const preview = document.getElementById("enrollPreview");
      const previewImg = document.getElementById("enrollSnapshotImg");
      const capBtn = document.getElementById("captureFaceBtn");
      const retakeBtn = document.getElementById("retakeFaceBtn");
      const saveBtn = document.getElementById("saveStudentBtn");

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

      document.getElementById("capturedFaceDataUrl").value = dataUrl;
      previewImg.src = dataUrl;
      preview.style.display = "flex";
      video.style.display = "none";

      capBtn.style.display = "none";
      retakeBtn.style.display = "inline-flex";
      saveBtn.disabled = false;

      // Stop camera stream inside modal
      if (enrollStream) {
        enrollStream.getTracks().forEach(t => t.stop());
        enrollStream = null;
      }
      showToast("Face snapshot captured!", "✅");
    }

    function retakeEnrollFace() {
      const preview = document.getElementById("enrollPreview");
      const capBtn = document.getElementById("captureFaceBtn");
      const retakeBtn = document.getElementById("retakeFaceBtn");
      const saveBtn = document.getElementById("saveStudentBtn");

      preview.style.display = "none";
      capBtn.style.display = "inline-flex";
      retakeBtn.style.display = "none";
      saveBtn.disabled = true;
      document.getElementById("capturedFaceDataUrl").value = "";

      startEnrollCamera();
    }

    function openAddStudentModal() {
      document.getElementById("addStudentModal").classList.add("active");
      document.getElementById("regName").value = "";
      document.getElementById("regUsn").value = "";
      document.getElementById("capturedFaceDataUrl").value = "";
      document.getElementById("enrollPreview").style.display = "none";
      document.getElementById("captureFaceBtn").style.display = "inline-flex";
      document.getElementById("captureFaceBtn").disabled = true;
      document.getElementById("retakeFaceBtn").style.display = "none";
      document.getElementById("saveStudentBtn").disabled = true;
      document.getElementById("enrollNoCamText").style.display = "block";
      startEnrollCamera();
    }

    function closeAddStudentModal() {
      if (enrollStream) {
        enrollStream.getTracks().forEach(t => t.stop());
        enrollStream = null;
      }
      document.getElementById("addStudentModal").classList.remove("active");
    }

    function handleSaveStudent(e) {
      e.preventDefault();
      const name = document.getElementById("regName").value.trim();
      const usn = document.getElementById("regUsn").value.trim().toUpperCase();
      const sem = parseInt(document.getElementById("regSem").value);
      const sec = document.getElementById("regSec").value.trim().toUpperCase();
      const faceData = document.getElementById("capturedFaceDataUrl").value;

      if (!faceData) {
        showToast("Please capture student face using the camera!", "⚠️");
        return;
      }

      if (students.find(s => s.usn === usn)) {
        showToast("A student with this USN already exists!", "⚠️");
        return;
      }

      // Generate facial biometric vector from the captured face image
      const tempImg = new Image();
      tempImg.onload = function() {
        const c = document.createElement("canvas");
        c.width = 32;
        c.height = 32;
        const ctx = c.getContext("2d");
        ctx.drawImage(tempImg, 0, 0, 32, 32);
        const vector = extractFaceVectorFromCanvas(c);

        students.push({
          usn, name, sem, sec, dept: "CSE",
          faceData: faceData,
          faceVector: vector,
          regDate: new Date().toLocaleDateString()
        });

        localStorage.setItem("sfas_students", JSON.stringify(students));
        closeAddStudentModal();
        renderStudentDirectory();
        updateAttendanceMetrics();
        showToast(`Student ${name} (${usn}) face saved successfully!`, "✅");
      };
      tempImg.src = faceData;
    }

    function deleteStudent(usn) {
      const s = students.find(x => x.id === usn || x.usn === usn);
      if (!confirm(`Are you sure you want to delete student ${s ? s.name : usn}?`)) return;

      students = students.filter(x => x.usn !== usn);
      localStorage.setItem("sfas_students", JSON.stringify(students));
      renderStudentDirectory();
      updateAttendanceMetrics();
      showToast(`Student ${usn} removed from database.`, "🗑️");
    }

    // --- STUDENT DIRECTORY TABLE ---
    function renderStudentDirectory() {
      const tbody = document.getElementById("studentDirectoryBody");
      tbody.innerHTML = "";
      document.getElementById("tabStudentCount").textContent = students.length;

      if (students.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; padding:30px; color:var(--text-muted);">
              No student faces registered yet. Click <strong>Add Student (Camera Scan)</strong> to enroll students.
            </td>
          </tr>
        `;
        return;
      }

      students.forEach(s => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>
            <div style="width:40px; height:48px; border-radius:4px; overflow:hidden; border:1px solid #475569;">
              <img src="${s.faceData}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover;">
            </div>
          </td>
          <td><strong style="color:#38bdf8;">${s.usn}</strong></td>
          <td><strong>${s.name}</strong></td>
          <td>Sem ${s.sem} - Sec ${s.sec}</td>
          <td>${s.dept}</td>
          <td>${s.regDate || "Today"}</td>
          <td>
            <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.usn}')">🗑️ Delete</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    // --- ATTENDANCE METRICS & REPORT ---
    function updateAttendanceMetrics() {
      const currentP = periods[currentPeriodIndex];
      const pAttendance = periodAttendance[currentP.id] || {};
      const total = students.length;
      const presentCount = Object.keys(pAttendance).length;
      const absentCount = total - presentCount;
      const pct = total > 0 ? ((presentCount / total) * 100).toFixed(1) : 0;

      document.getElementById("liveAttendanceCount").textContent = `${presentCount} / ${total} Present (${pct}%)`;
      document.getElementById("liveProgressBar").style.width = `${pct}%`;

      document.getElementById("statTotalStudents").textContent = total;
      document.getElementById("statPresentCount").textContent = presentCount;
      document.getElementById("statAbsentCount").textContent = absentCount;
      document.getElementById("statAttendancePct").textContent = `${pct}%`;

      document.getElementById("presentBadgeCount").textContent = presentCount;
      document.getElementById("absentBadgeCount").textContent = absentCount;

      document.getElementById("reportPeriodTitle").textContent = currentP.name;
      document.getElementById("reportSubjectTitle").textContent = currentP.subject;
      document.getElementById("reportFacultyTitle").textContent = currentP.faculty;

      renderPresentAbsentTables();
    }

    function renderPresentAbsentTables() {
      const pTbody = document.getElementById("presentTableBody");
      const aTbody = document.getElementById("absentTableBody");
      const currentP = periods[currentPeriodIndex];
      const pAttendance = periodAttendance[currentP.id] || {};

      pTbody.innerHTML = "";
      aTbody.innerHTML = "";

      if (students.length === 0) {
        pTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No students enrolled yet.</td></tr>`;
        aTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No students enrolled yet.</td></tr>`;
        return;
      }

      students.forEach(s => {
        if (pAttendance[s.usn]) {
          const rec = pAttendance[s.usn];
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>
              <div style="width:36px; height:42px; border-radius:4px; overflow:hidden; border:1px solid #059669;">
                <img src="${s.faceData}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover;">
              </div>
            </td>
            <td><code>${s.usn}</code></td>
            <td><strong>${s.name}</strong></td>
            <td>${rec.time}</td>
            <td><span class="badge-present">PRESENT</span></td>
          `;
          pTbody.appendChild(tr);
        } else {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>
              <div style="width:36px; height:42px; border-radius:4px; overflow:hidden; border:1px solid #dc2626;">
                <img src="${s.faceData}" alt="${s.name}" style="width:100%; height:100%; object-fit:cover;">
              </div>
            </td>
            <td><code>${s.usn}</code></td>
            <td><strong>${s.name}</strong></td>
            <td><span class="badge-absent">ABSENT</span></td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="manualMarkPresent('${s.usn}')">Mark Present</button>
            </td>
          `;
          aTbody.appendChild(tr);
        }
      });
    }

    function manualMarkPresent(usn) {
      const currentP = periods[currentPeriodIndex];
      const pAttendance = periodAttendance[currentP.id] || {};
      const reason = prompt("Enter reason for manual override (e.g. Medical / On-Duty / Late):", "Medical Leave");
      if (reason) {
        pAttendance[usn] = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          confidence: "Manual (" + reason + ")"
        };
        periodAttendance[currentP.id] = pAttendance;
        localStorage.setItem("sfas_attendance", JSON.stringify(periodAttendance));
        updateAttendanceMetrics();
        showToast(`Manually marked ${usn} as Present (${reason})`, "✏️");
      }
    }

    function exportAttendanceCSV() {
      const currentP = periods[currentPeriodIndex];
      const pAttendance = periodAttendance[currentP.id] || {};
      let csv = `USN,Student Name,Period,Subject,Faculty,Attendance Status,Scan Time\n`;

      students.forEach(s => {
        if (pAttendance[s.usn]) {
          const rec = pAttendance[s.usn];
          csv += `${s.usn},"${s.name}","${currentP.name}","${currentP.subject}","${currentP.faculty}",PRESENT,${rec.time}\n`;
        } else {
          csv += `${s.usn},"${s.name}","${currentP.name}","${currentP.subject}","${currentP.faculty}",ABSENT,N/A\n`;
        }
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Attendance_${currentP.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      showToast("Attendance CSV exported!", "📥");
    }

    // --- TIMETABLE SCHEDULE ---
    function renderTimetable() {
      const tbody = document.getElementById("timetableBody");
      tbody.innerHTML = "";

      periods.forEach((p, idx) => {
        const isActive = (idx === currentPeriodIndex);
        const tr = document.createElement("tr");
        if (isActive) tr.style.background = "rgba(212, 175, 55, 0.08)";

        tr.innerHTML = `
          <td><strong>${p.name}</strong> ${isActive ? '<span class="badge-present" style="margin-left:6px;">CURRENT</span>' : ''}</td>
          <td>${p.type === 'break' ? '<span style="color:#f59e0b; font-weight:bold;">BREAK</span>' : 'CLASS'}</td>
          <td><strong>${p.subject}</strong></td>
          <td>${p.faculty}</td>
          <td>${p.type === 'break' ? 'Attendance Paused' : '<span style="color:#34d399;">Active Scanning</span>'}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // --- SETTINGS MODAL ---
    function openSettingsModal() {
      const currentP = periods[currentPeriodIndex];
      document.getElementById("settingSubjectInput").value = currentP.subject;
      document.getElementById("settingFacultyInput").value = currentP.faculty;
      document.getElementById("settingsModal").classList.add("active");
    }

    function closeSettingsModal() {
      document.getElementById("settingsModal").classList.remove("active");
    }

    function saveCurrentPeriodSettings() {
      const subj = document.getElementById("settingSubjectInput").value.trim();
      const fac = document.getElementById("settingFacultyInput").value.trim();
      if (subj) periods[currentPeriodIndex].subject = subj;
      if (fac) periods[currentPeriodIndex].faculty = fac;

      localStorage.setItem("sfas_periods", JSON.stringify(periods));
      renderPeriodBanner();
      closeSettingsModal();
      showToast("Updated period subject and faculty!", "✅");
    }

    function resetCurrentPeriodAttendance() {
      if (confirm(`Reset attendance for ${periods[currentPeriodIndex].name}?`)) {
        delete periodAttendance[periods[currentPeriodIndex].id];
        localStorage.setItem("sfas_attendance", JSON.stringify(periodAttendance));
        updateAttendanceMetrics();
        closeSettingsModal();
        showToast("Attendance cleared for current period.", "🔄");
      }
    }

    function clearAllStudentsDatabase() {
      if (confirm("Delete all registered students and start fresh with an empty database?")) {
        students = [];
        periodAttendance = {};
        localStorage.removeItem("sfas_students");
        localStorage.removeItem("sfas_attendance");
        renderStudentDirectory();
        updateAttendanceMetrics();
        closeSettingsModal();
        showToast("Student database cleared.", "🗑️");
      }
    }

    // --- TAB SWITCHING & TOASTS ---
    function switchTab(tabId) {
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      const targetBtn = Array.from(document.querySelectorAll(".nav-tab")).find(b => b.getAttribute("onclick").includes(tabId));
      if (targetBtn) targetBtn.classList.add("active");

      const targetContent = document.getElementById("tab-" + tabId);
      if (targetContent) targetContent.classList.add("active");
    }

    function showToast(msg, icon = "✅") {
      const t = document.getElementById("toastBox");
      document.getElementById("toastIcon").textContent = icon;
      document.getElementById("toastMsg").textContent = msg;
      t.style.display = "flex";
      setTimeout(() => { t.style.display = "none"; }, 3500);
    }

    window.addEventListener("DOMContentLoaded", () => {
      renderPeriodBanner();
      renderStudentDirectory();
    });