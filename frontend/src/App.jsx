import React, { useState, useEffect, useRef, useCallback } from 'react';
import parentLogo from './assets/Parent logo.avif';
import studentIcon from './assets/Student Icon.png';
import teacherIcon from './assets/Teacher Icon.avif';

const parseResponse = async (res) => {
  const text = await res.text();
  if (!text) return { data: {}, text: '' };
  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: {}, text };
  }
};

// --- SEMICIRCLE SVG GAUGE COMPONENT (For Student View) ---
function SemiCircleGauge({ percentage = 0 }) {
  const validPct = Math.min(Math.max(percentage, 0), 100);
  const rotationAngle = -90 + (validPct / 100) * 180;
  const statusRanges = [
    { max: 40, color: '#ef4444' },
    { max: 50, color: '#f97316' },
    { max: 100, color: '#16a34a' }
  ];
  let angleStart = -180;

  return (
    <div style={{ textAlign: 'center', width: '100%', maxWidth: '280px', margin: '0 auto' }}>
      <svg viewBox="0 0 200 120" style={{ width: '100%', overflow: 'visible' }}>
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.2" />
          </filter>
        </defs>
        {statusRanges.map((segment, index) => {
          const prevMax = index === 0 ? 0 : statusRanges[index - 1].max;
          const segmentAngle = ((segment.max - prevMax) / 100) * 180;
          const startAngle = angleStart + 2;
          const endAngle = angleStart + segmentAngle - 2;
          angleStart += segmentAngle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const outerR = 90;
          const innerR = 60;
          const cx = 100;
          const cy = 100;
          const x1 = cx + outerR * Math.cos(startRad);
          const y1 = cy + outerR * Math.sin(startRad);
          const x2 = cx + outerR * Math.cos(endRad);
          const y2 = cy + outerR * Math.sin(endRad);
          const x3 = cx + innerR * Math.cos(endRad);
          const y3 = cy + innerR * Math.sin(endRad);
          const x4 = cx + innerR * Math.cos(startRad);
          const y4 = cy + innerR * Math.sin(startRad);
          const pathData = `
            M ${x1} ${y1} 
            A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} 
            L ${x3} ${y3} 
            A ${innerR} ${innerR} 0 0 0 ${x4} ${y4} 
            Z
          `;
          return <path key={index} d={pathData} fill={segment.color} />;
        })}
        <g 
          transform={`translate(100, 100) rotate(${rotationAngle})`} 
          style={{ transition: 'transform 0.8s ease-out' }}
        >
          <line x1="0" y1="0" x2="0" y2="-72" stroke="#2c3e50" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="-4,-65 0,-76 4,-65" fill="#2c3e50" />
          <circle cx="0" cy="0" r="8" fill="#ffffff" stroke="#2c3e50" strokeWidth="3.5" filter="url(#shadow)" />
        </g>
      </svg>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', marginTop: '10px' }}>
        {validPct}%
      </div>
    </div>
  );
}

// --- TRAFFIC LIGHT CHART COMPONENT (For Parent View) ---
function TrafficLightChart({ statusCode = 'GREEN', percentage = 0 }) {
  const isRed = statusCode === 'RED';
  const isYellow = statusCode === 'YELLOW';
  const isGreen = statusCode === 'GREEN';

  return (
    <div style={{ textAlign: 'center', margin: '0 auto', width: '100%', maxWidth: '200px' }}>
      <div style={{
        width: '80px',
        backgroundColor: '#333',
        padding: '12px 10px',
        borderRadius: '20px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          backgroundColor: isRed ? '#ff4d4f' : '#552222',
          boxShadow: isRed ? '0 0 15px #ff4d4f' : 'none',
          transition: 'all 0.4s ease'
        }} />
        <div style={{
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          backgroundColor: isYellow ? '#ffc53d' : '#554411',
          boxShadow: isYellow ? '0 0 15px #ffc53d' : 'none',
          transition: 'all 0.4s ease'
        }} />
        <div style={{
          width: '45px',
          height: '45px',
          borderRadius: '50%',
          backgroundColor: isGreen ? '#52c41a' : '#114411',
          boxShadow: isGreen ? '0 0 15px #52c41a' : 'none',
          transition: 'all 0.4s ease'
        }} />
      </div>
      <div style={{ fontSize: '22px', fontWeight: 'bold', marginTop: '12px', color: '#2c3e50' }}>
        {percentage}%
      </div>
    </div>
  );
}

// --- INTERACTIVE BAR GRAPH COMPONENT (For Teacher View) ---
function ClassStatusChart({ statusCounts, activeFilter, onSelectFilter }) {
  const orderedStatuses = ['On Track', 'Needs Review', 'At Risk'];
  const statusColors = {
    'On Track': '#16a34a',
    'Needs Review': '#f97316',
    'At Risk': '#ef4444'
  };
  const visible = orderedStatuses.filter(status => (statusCounts[status] || 0) > 0);

  return (
    <div style={{ background: '#ffffff', padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '16px' }}>Class Performance Breakdown</h4>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '12px' }}>Tap a status to filter students.</p>
        </div>
        {activeFilter && (
          <button onClick={() => onSelectFilter(null)} style={{ padding: '6px 12px', fontSize: '12px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            Clear Filter
          </button>
        )}
      </div>
      {visible.length === 0 ? (
        <div style={{ padding: '20px 8px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>No students found.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {visible.map(status => {
            const count = statusCounts[status] || 0;
            const totalStudents = Object.values(statusCounts).reduce((sum, value) => sum + value, 0) || 1;
            const pct = Math.round((count / totalStudents) * 100);
            const isSelected = activeFilter === status;
            return (
              <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => onSelectFilter(isSelected ? null : status)}>
                <div style={{ width: '95px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: '13px' }}>{status}</div>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: '8px', padding: '4px', position: 'relative', border: isSelected ? '2px solid #111827' : '1px solid #e5e7eb' }}>
                  <div title={`${count} students (${pct}%)`} style={{ width: `${pct}%`, minWidth: '6px', height: '24px', background: statusColors[status], borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: pct > 15 ? 'flex-start' : 'flex-end', padding: '0 6px', color: '#fff', fontWeight: 700 }}>
                    <span style={{ fontSize: '12px' }}>{count}</span>
                  </div>
                </div>
                <div style={{ width: '38px', textAlign: 'right', color: '#6b7280', fontSize: '12px' }}>{pct}%</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({
    grade_class: '',
    subject: '',
    name: '',
    pin: '',
    teacher_id: '',
    password: ''
  });

  const [isTeacherLoggedIn, setIsTeacherLoggedIn] = useState(false);
  const [teacherData, setTeacherData] = useState(null);
  const [teacherClassStudents, setTeacherClassStudents] = useState([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [portalData, setPortalData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const isUserEditingRef = useRef(false);

  const availableClasses = ['Grade 10A', 'Grade 10B', 'Grade 11A', 'Grade 12A'];
  const availableSubjects = ['Mathematics', 'Physical Sciences', 'Life Sciences', 'Electrical Technology'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const nextFormData = {
      ...formData,
      [name]: value,
      ...(name === 'grade_class' && selectedRole === 'teacher' ? { subject: '' } : {})
    };
    if (selectedRole === 'teacher' && (name === 'grade_class' || name === 'subject')) {
      setTeacherClassStudents([]);
      setSelectedStatusFilter(null);
      setSaveSuccessMsg('');
      isUserEditingRef.current = false;
    }
    setFormData(nextFormData);
  };

  const resetFlow = () => {
    setSelectedRole(null);
    setIsTeacherLoggedIn(false);
    setPortalData(null);
    setTeacherData(null);
    setTeacherClassStudents([]);
    setSelectedStatusFilter(null);
    setErrorMsg('');
    setSaveSuccessMsg('');
    isUserEditingRef.current = false;
    setFormData({
      grade_class: '',
      subject: '',
      name: '',
      pin: '',
      teacher_id: '',
      password: ''
    });
  };

  const fetchStudentRecord = async ({ grade_class, subject, name, pin }, isBackground = false) => {
    if (!isBackground) setErrorMsg('');
    try {
      const res = await fetch('/api/student/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade_class, subject, name, pin })
      });
      const { data, text } = await parseResponse(res);
      if (!res.ok) throw new Error(data?.detail || text || 'Failed to fetch academic record');
      setPortalData(data);
      return data;
    } catch (err) {
      if (!isBackground) setErrorMsg(err.message);
      return null;
    }
  };

  const handleStudentParentSubmit = async (e) => {
    e.preventDefault();
    await fetchStudentRecord({
      grade_class: formData.grade_class,
      subject: formData.subject,
      name: formData.name,
      pin: formData.pin
    });
  };

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: formData.teacher_id,
          password: formData.password
        })
      });
      const { data, text } = await parseResponse(res);
      if (!res.ok) throw new Error(data?.detail || text || 'Teacher authentication failed');
      setTeacherData(data);
      setIsTeacherLoggedIn(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const fetchClassData = useCallback(async (isBackground = false) => {
    if (!formData.grade_class || !formData.subject) return;
    if (isBackground && isUserEditingRef.current) return;

    if (!isBackground) {
      setErrorMsg('');
      setSaveSuccessMsg('');
    }

    try {
      const res = await fetch(`/api/teacher/class-data?grade_class=${encodeURIComponent(formData.grade_class)}&subject=${encodeURIComponent(formData.subject)}`, {
        headers: { 'Authorization': `Bearer ${teacherData?.access_token || ''}` }
      });
      const { data, text } = await parseResponse(res);
      if (!res.ok) throw new Error(data?.detail || text || 'Failed to fetch class records');
      
      const processed = (data.students || []).map((student, originalIndex) => {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        Object.keys(student).forEach(key => {
          if (key !== 'name' && !key.endsWith('_Weight')) {
            const weightKey = `${key}_Weight`;
            const rawScore = student[key];
            const score = rawScore !== null && rawScore !== undefined && rawScore !== '' && !Number.isNaN(Number(rawScore)) ? Number(rawScore) : null;
            const weight = score !== null ? Number(student[weightKey]) || 0 : 0;
            if (score !== null && key.toLowerCase() !== 'exam') {
              totalWeightedScore += (score * weight);
              totalWeight += weight;
            }
          }
        });
        const pct = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
        let status = 'At Risk';
        if (pct >= 50) status = 'On Track';
        else if (pct >= 40) status = 'Needs Review';
        return { ...student, _pct: Math.round(pct), _status: status, _originalIndex: originalIndex };
      });

      setTeacherClassStudents(processed);
      if (!isBackground) setSelectedStatusFilter(null);
    } catch (err) {
      if (!isBackground) setErrorMsg(err.message);
    }
  }, [formData.grade_class, formData.subject, teacherData?.access_token]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (selectedRole === 'teacher' && isTeacherLoggedIn && formData.grade_class && formData.subject) {
        fetchClassData(true);
      } else if ((selectedRole === 'student' || selectedRole === 'parent') && portalData) {
        fetchStudentRecord({
          grade_class: formData.grade_class,
          subject: formData.subject,
          name: formData.name,
          pin: formData.pin
        }, true);
      }
    }, 5000);

    return () => clearInterval(timer);
  }, [selectedRole, isTeacherLoggedIn, formData, portalData, fetchClassData]);

  const handleMarkChange = (originalIndex, field, value) => {
    isUserEditingRef.current = true;
    const updated = [...teacherClassStudents];
    const targetIdx = updated.findIndex(s => s._originalIndex === originalIndex);
    if (targetIdx === -1) return;
    
    const formattedVal = value === '' ? '' : Math.min(100, Math.max(0, Number(value)));
    updated[targetIdx][field] = formattedVal;
    
    let totalWeightedScore = 0;
    let totalWeight = 0;
    Object.keys(updated[targetIdx]).forEach(key => {
      if (key !== 'name' && !key.endsWith('_Weight') && !key.startsWith('_')) {
        const rawScore = updated[targetIdx][key];
        const score = rawScore !== '' && rawScore !== null && rawScore !== undefined && !Number.isNaN(Number(rawScore)) ? Number(rawScore) : null;
        const weight = score !== null ? Number(updated[targetIdx][`${key}_Weight`]) || 0 : 0;
        if (score !== null && key.toLowerCase() !== 'exam') {
          totalWeightedScore += (score * weight);
          totalWeight += weight;
        }
      }
    });
    const pct = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
    let status = 'At Risk';
    if (pct >= 50) status = 'On Track';
    else if (pct >= 40) status = 'Needs Review';
    updated[targetIdx]._pct = Math.round(pct);
    updated[targetIdx]._status = status;
    setTeacherClassStudents(updated);
  };

  const handleSaveMarks = async () => {
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccessMsg('');
    
    const cleanedStudents = teacherClassStudents.map(({ _pct, _status, _originalIndex, ...cleanStudent }) => {
      const sanitized = { ...cleanStudent };
      Object.keys(sanitized).forEach(k => {
        if (sanitized[k] === '') sanitized[k] = null;
      });
      return sanitized;
    });

    try {
      const res = await fetch('/api/teacher/update-marks', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${teacherData?.access_token || ''}`
        },
        body: JSON.stringify({
          grade_class: formData.grade_class,
          subject: formData.subject,
          students: cleanedStudents
        })
      });
      const { data, text } = await parseResponse(res);
      if (!res.ok) throw new Error(data?.detail || text || 'Failed to persist assessment changes');
      setSaveSuccessMsg('Marks saved successfully!');
      isUserEditingRef.current = false;
      await fetchClassData(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const getTeacherSubjectsForSelectedClass = () => {
    if (!teacherData?.assignments) return [];
    const filtered = teacherData.assignments
      .filter(a => a.class_name === formData.grade_class)
      .map(a => a.subject);
    return [...new Set(filtered)];
  };

  const getStatusCounts = () => {
    const counts = { 'At Risk': 0, 'Needs Review': 0, 'On Track': 0 };
    teacherClassStudents.forEach(s => {
      if (counts[s._status] !== undefined) counts[s._status]++;
    });
    return counts;
  };

  const filteredStudents = selectedStatusFilter 
    ? teacherClassStudents.filter(s => s._status === selectedStatusFilter)
    : teacherClassStudents;

  return (
    <div style={{ maxWidth: '900px', margin: '15px auto', fontFamily: 'Arial, sans-serif', padding: '0 12px', boxSizing: 'border-box' }}>
      
      {/* 1. ROLE SELECTION LANDING PAGE */}
      {!selectedRole && (
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <h2 style={{ fontSize: '22px' }}>Academic Performance Tracker</h2>
          <p style={{ color: '#666', marginBottom: '25px', fontSize: '14px' }}>Select your portal to proceed</p>
          
          {/* Responsive Card Container */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            justifyContent: 'center'
          }}>
            <div onClick={() => setSelectedRole('student')} style={cardStyle}>
              <img src={studentIcon} alt="Student" style={iconStyle} />
              <h3 style={{ margin: '10px 0 4px 0', fontSize: '18px' }}>Student</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>View progress & target marks</p>
            </div>
            <div onClick={() => setSelectedRole('parent')} style={cardStyle}>
              <img src={parentLogo} alt="Parent" style={iconStyle} />
              <h3 style={{ margin: '10px 0 4px 0', fontSize: '18px' }}>Parent</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Track child's performance</p>
            </div>
            <div onClick={() => setSelectedRole('teacher')} style={cardStyle}>
              <img src={teacherIcon} alt="Teacher" style={iconStyle} />
              <h3 style={{ margin: '10px 0 4px 0', fontSize: '18px' }}>Teacher</h3>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Manage class spreadsheets</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. STUDENT & PARENT VIEW */}
      {(selectedRole === 'student' || selectedRole === 'parent') && (
        <div>
          <button onClick={resetFlow} style={backBtnStyle}>← Back to Roles</button>
          
          <h3 style={{ fontSize: '20px', marginTop: '10px' }}>{selectedRole === 'student' ? 'Student Portal' : 'Parent Portal'}</h3>
          <form onSubmit={handleStudentParentSubmit} style={formBoxStyle}>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Select Grade / Class:</label>
              <select name="grade_class" value={formData.grade_class} onChange={handleInputChange} required style={inputStyle}>
                <option value="">-- Choose Class --</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Select Subject:</label>
              <select name="subject" value={formData.subject} onChange={handleInputChange} required style={inputStyle}>
                <option value="">-- Choose Subject --</option>
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Full Name:</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} required style={inputStyle} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>PIN:</label>
              <input type="password" name="pin" value={formData.pin} onChange={handleInputChange} required style={inputStyle} />
            </div>
            <button type="submit" style={btnStyle}>Fetch Academic Record</button>
          </form>
          {errorMsg && <p style={{ color: '#dc3545', marginTop: '15px', fontWeight: 'bold', fontSize: '14px' }}>{errorMsg}</p>}

          {/* ACADEMIC DISPLAY DASHBOARD */}
          {portalData && (
            <div style={{ marginTop: '25px' }}>
              <h3 style={{ fontSize: '18px' }}>Learner: {portalData.name} ({portalData.subject})</h3>
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', border: '1px solid #e9ecef', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <h4 style={{ margin: 0, fontSize: '16px' }}>Term Progress</h4>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    fontWeight: 'bold', 
                    fontSize: '12px',
                    color: portalData.status_code === 'YELLOW' ? '#000' : '#fff',
                    backgroundColor: portalData.status_code === 'GREEN' ? '#52c41a' : portalData.status_code === 'YELLOW' ? '#ffc53d' : '#ff4d4f'
                  }}>
                    Status: {portalData.term_status}
                  </span>
                </div>
                {selectedRole === 'parent' ? (
                  <TrafficLightChart 
                    statusCode={portalData.status_code} 
                    percentage={portalData.current_percentage} 
                  />
                ) : (
                  <SemiCircleGauge percentage={portalData.current_percentage} />
                )}
              </div>

              <div style={{ background: '#eef6ff', borderLeft: '4px solid #007bff', padding: '14px', borderRadius: '6px', marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', color: '#0056b3', fontSize: '15px' }}>Exam Pass Target Calculator</h4>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: '1.4' }}>
                  {selectedRole === 'parent' 
                    ? 'To achieve an overall passing grade of 50% for this term, your child needs a minimum score of:' 
                    : 'To achieve an overall passing grade of 50% for this term, you need a minimum score of:'}
                </p>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0056b3', marginTop: '6px' }}>
                  {portalData.required_remaining_mark !== null && portalData.required_remaining_mark !== undefined ? `${portalData.required_remaining_mark}%` : 'N/A'} on remaining assessments
                </div>
              </div>

              <h4 style={{ fontSize: '16px', marginBottom: '10px' }}>Assessment Breakdown</h4>
              <div style={responsiveTableWrapper}>
                <table cellPadding="10" style={tableStyle}>
                  <thead>
                    <tr style={{ background: '#f1f3f5', fontSize: '13px' }}>
                      <th style={thTdStyle}>Assessment Name</th>
                      <th style={thTdStyle}>Score Obtained</th>
                      <th style={thTdStyle}>Weighting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portalData.assessments && portalData.assessments.map((item, idx) => (
                      <tr key={idx} style={{ fontSize: '13px' }}>
                        <td style={thTdStyle}>{item.name}</td>
                        <td style={thTdStyle}>
                          {item.score !== null && item.score !== undefined ? (
                            <strong>{item.score}%</strong>
                          ) : item.class_has_mark ? (
                            <strong>0%</strong>
                          ) : (
                            <em style={{ color: '#6b7280' }}>Not completed</em>
                          )}
                        </td>
                        <td style={thTdStyle}>{(item.weight * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TEACHER VIEW */}
      {selectedRole === 'teacher' && (
        <div>
          <button onClick={resetFlow} style={backBtnStyle}>← Back to Roles</button>
          <h3 style={{ fontSize: '20px', marginTop: '10px' }}>Teacher Portal</h3>
          {!isTeacherLoggedIn ? (
            <form onSubmit={handleTeacherLogin} style={formBoxStyle}>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Teacher ID:</label>
                <input type="text" name="teacher_id" value={formData.teacher_id} onChange={handleInputChange} required style={inputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Password:</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required style={inputStyle} />
              </div>
              <button type="submit" style={btnStyle}>Login to Teacher Portal</button>
            </form>
          ) : (
            <div>
              <div style={{ ...formBoxStyle, maxWidth: '100%', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Assigned Class:</label>
                    <select name="grade_class" value={formData.grade_class} onChange={handleInputChange} style={inputStyle}>
                      <option value="">-- Choose Assigned Class --</option>
                      {[...new Set(teacherData?.assignments?.map(a => a.class_name) || [])].map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Assigned Subject:</label>
                    <select name="subject" value={formData.subject} onChange={handleInputChange} style={inputStyle} disabled={!formData.grade_class}>
                      <option value="">-- Choose Subject --</option>
                      {getTeacherSubjectsForSelectedClass().map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button onClick={() => fetchClassData(false)} disabled={!formData.grade_class || !formData.subject} style={{ ...btnStyle, marginTop: '12px' }}>
                  Load Class Records
                </button>
              </div>

              {teacherClassStudents.length > 0 && (
                <div>
                  <ClassStatusChart 
                    statusCounts={getStatusCounts()} 
                    activeFilter={selectedStatusFilter}
                    onSelectFilter={setSelectedStatusFilter}
                  />
                  
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <h4 style={{ margin: 0, fontSize: '15px' }}>Student Assessments</h4>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      Showing {filteredStudents.length} of {teacherClassStudents.length} students
                    </span>
                  </div>

                  {/* Horizontal Scroll Wrapper for Wide Spreadsheet Tables */}
                  <div style={responsiveTableWrapper}>
                    <table cellPadding="8" style={tableStyle}>
                      <thead>
                        <tr style={{ background: '#f1f3f5', fontSize: '13px' }}>
                          <th style={thTdStyle}>Student Name</th>
                          {Object.keys(teacherClassStudents[0])
                            .filter(k => k !== 'name' && !k.endsWith('_Weight') && !k.startsWith('_'))
                            .map(col => (
                              <th key={col} style={thTdStyle}>{col} (%)</th>
                            ))}
                          <th style={thTdStyle}>Average</th>
                          <th style={thTdStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr key={student._originalIndex} style={{ fontSize: '13px' }}>
                            <td style={{ ...thTdStyle, whiteSpace: 'nowrap' }}><strong>{student.name}</strong></td>
                            {Object.keys(student)
                              .filter(k => k !== 'name' && !k.endsWith('_Weight') && !k.startsWith('_'))
                              .map(col => (
                                <td key={col} style={thTdStyle}>
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    value={student[col] ?? ''} 
                                    onFocus={() => { isUserEditingRef.current = true; }}
                                    onChange={(e) => handleMarkChange(student._originalIndex, col, e.target.value)}
                                    style={{ width: '55px', padding: '6px 4px', borderRadius: '4px', border: '1px solid #ccc', textAlign: 'center', fontSize: '14px' }}
                                  />
                                </td>
                              ))}
                            <td style={thTdStyle}><strong>{student._pct}%</strong></td>
                            <td style={thTdStyle}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                color: student._status === 'Needs Review' ? '#000' : '#fff',
                                backgroundColor:
                                  student._status === 'On Track' ? '#16a34a' :
                                  student._status === 'Needs Review' ? '#f97316' : '#ef4444'
                              }}>
                                {student._status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button 
                    onClick={handleSaveMarks} 
                    disabled={isSaving}
                    style={{ ...btnStyle, marginTop: '16px', backgroundColor: '#007bff' }}
                  >
                    {isSaving ? 'Saving...' : 'Save Assessment Changes'}
                  </button>
                  {saveSuccessMsg && <p style={{ color: '#28a745', marginTop: '10px', fontWeight: 'bold', fontSize: '14px' }}>{saveSuccessMsg}</p>}
                </div>
              )}
            </div>
          )}
          {errorMsg && <p style={{ color: '#dc3545', marginTop: '15px', fontWeight: 'bold', fontSize: '14px' }}>{errorMsg}</p>}
        </div>
      )}
    </div>
  );
}

// --- STYLES ---
const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: '12px',
  padding: '20px 16px',
  cursor: 'pointer',
  boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
  backgroundColor: '#fff',
  textAlign: 'center',
  transition: 'transform 0.1s ease'
};

const iconStyle = {
  width: '75px',
  height: '75px',
  objectFit: 'contain'
};

const formBoxStyle = {
  background: '#f9fafb',
  padding: '16px',
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  maxWidth: '500px',
  margin: '0 auto'
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#374151',
  marginBottom: '4px',
  display: 'inline-block'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '6px',
  border: '1px solid #d1d5db',
  boxSizing: 'border-box',
  fontSize: '14px',
  backgroundColor: '#fff'
};

const btnStyle = {
  width: '100%',
  padding: '12px 16px',
  backgroundColor: '#28a745',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '14px'
};

const backBtnStyle = {
  padding: '6px 12px',
  marginBottom: '12px',
  cursor: 'pointer',
  backgroundColor: '#4b5563',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px'
};

const responsiveTableWrapper = {
  overflowX: 'auto',
  WebkitOverflowScrolling: 'touch',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  marginBottom: '15px'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left',
  minWidth: '450px'
};

const thTdStyle = {
  borderBottom: '1px solid #e5e7eb',
  padding: '10px 12px'
};