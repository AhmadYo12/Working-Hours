import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import './Dashboard.css';

function Dashboard() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedule, setSchedule] = useState({});
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [timeEntry, setTimeEntry] = useState({ actualStart: '', actualEnd: '', notes: '' });
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadUserName();
    loadSchedule();
    loadAttendance();
  }, [currentMonth]);

  const loadUserName = async () => {
    const userPhone = localStorage.getItem('userPhone');
    const profileDoc = await getDoc(doc(db, 'users', userPhone, 'profile', 'info'));
    if (profileDoc.exists()) {
      const data = profileDoc.data();
      setUserName(`${data.firstName} ${data.lastName}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.reload();
  };

  const loadSchedule = async () => {
    const userPhone = localStorage.getItem('userPhone');
    const docRef = doc(db, 'users', userPhone, 'workSchedule', 'schedule');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setSchedule(docSnap.data());
    }
  };

  const loadAttendance = async () => {
    const userPhone = localStorage.getItem('userPhone');
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const attendanceData = {};
    
    for (let day = 1; day <= new Date(year, month + 1, 0).getDate(); day++) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const docRef = doc(db, 'users', userPhone, 'attendance', date);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        attendanceData[date] = docSnap.data();
      }
    }
    setAttendance(attendanceData);
  };

  const getDayKey = (date) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  const calculateDifference = (scheduled, actual) => {
    const [sh, sm] = scheduled.split(':').map(Number);
    const [ah, am] = actual.split(':').map(Number);
    return (ah * 60 + am) - (sh * 60 + sm);
  };

  const saveAttendance = async () => {
    if (!selectedDate || !timeEntry.actualStart || !timeEntry.actualEnd) return;

    const dayKey = getDayKey(selectedDate);
    const daySchedule = schedule[dayKey];
    
    if (!daySchedule) {
      alert('هذا اليوم ليس من أيام دوامك!');
      return;
    }

    const lateMinutes = calculateDifference(daySchedule.startTime, timeEntry.actualStart);
    const overtimeMinutes = calculateDifference(daySchedule.endTime, timeEntry.actualEnd);

    const dateStr = selectedDate.toISOString().split('T')[0];
    const userPhone = localStorage.getItem('userPhone');

    await setDoc(doc(db, 'users', userPhone, 'attendance', dateStr), {
      date: dateStr,
      day: dayKey,
      scheduledStart: daySchedule.startTime,
      scheduledEnd: daySchedule.endTime,
      actualStart: timeEntry.actualStart,
      actualEnd: timeEntry.actualEnd,
      lateMinutes: Math.max(0, lateMinutes),
      overtimeMinutes: Math.max(0, overtimeMinutes),
      notes: timeEntry.notes
    });

    setSelectedDate(null);
    setTimeEntry({ actualStart: '', actualEnd: '', notes: '' });
    loadAttendance();
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const weeks = [];
    let week = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      week.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split('T')[0];
      const dayKey = getDayKey(date);
      const isWorkDay = !!schedule[dayKey];
      const hasAttendance = !!attendance[dateStr];

      week.push(
        <div
          key={day}
          className={`calendar-day ${isWorkDay ? 'work-day' : ''} ${hasAttendance ? 'has-attendance' : ''}`}
          onClick={() => isWorkDay && setSelectedDate(date)}
        >
          <div className="day-number">{day}</div>
          {hasAttendance && (
            <div className="attendance-info">
              {attendance[dateStr].lateMinutes > 0 && (
                <span className="late">تأخر {attendance[dateStr].lateMinutes} د</span>
              )}
              {attendance[dateStr].overtimeMinutes > 0 && (
                <span className="overtime">إضافي {attendance[dateStr].overtimeMinutes} د</span>
              )}
            </div>
          )}
        </div>
      );

      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }

    return weeks.map((w, i) => (
      <div key={i} className="calendar-week">
        {w.map((day, j) => day || <div key={j} className="calendar-day empty"></div>)}
      </div>
    ));
  };

  return (
    <div className="dashboard">
      <div className="welcome-header">
        <h2>مرحباً {userName}</h2>
        <button className="btn-logout-user" onClick={handleLogout}>تسجيل الخروج</button>
      </div>
      <div className="header">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}>
          ←
        </button>
        <h2>{currentMonth.toLocaleDateString('ar', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}>
          →
        </button>
      </div>

      <div className="calendar">
        <div className="calendar-header">
          <div>الأحد</div>
          <div>الإثنين</div>
          <div>الثلاثاء</div>
          <div>الأربعاء</div>
          <div>الخميس</div>
          <div>الجمعة</div>
          <div>السبت</div>
        </div>
        {renderCalendar()}
      </div>

      {selectedDate && (
        <div className="modal">
          <div className="modal-content">
            <h3>تسجيل الحضور - {selectedDate.toLocaleDateString('ar')}</h3>
            <input
              type="time"
              placeholder="وقت الحضور"
              value={timeEntry.actualStart}
              onChange={(e) => setTimeEntry({ ...timeEntry, actualStart: e.target.value })}
            />
            <input
              type="time"
              placeholder="وقت المغادرة"
              value={timeEntry.actualEnd}
              onChange={(e) => setTimeEntry({ ...timeEntry, actualEnd: e.target.value })}
            />
            <textarea
              placeholder="ملاحظات (اختياري)"
              value={timeEntry.notes}
              onChange={(e) => setTimeEntry({ ...timeEntry, notes: e.target.value })}
            />
            <div className="modal-buttons">
              <button onClick={saveAttendance}>حفظ</button>
              <button onClick={() => setSelectedDate(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
