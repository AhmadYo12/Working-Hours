import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import * as XLSX from 'xlsx';
import { IoDownload, IoLogOut, IoAddCircle, IoTrash, IoChevronBack, IoChevronForward, IoCalendar } from 'react-icons/io5';
import './AttendanceTable.css';

function AttendanceTable() {
  const [attendance, setAttendance] = useState([]);
  const [filteredAttendance, setFilteredAttendance] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [userName, setUserName] = useState('');
  const [filterType, setFilterType] = useState('month');
  const [currentPeriod] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [timeEntry, setTimeEntry] = useState({ start: '', end: '', notes: '' });

  const openQuickEntry = (date) => {
    setSelectedDate(date);
    setTimeEntry({ start: '', end: '', notes: '' });
    setShowModal(true);
  };

  const setQuickTime = (field, time) => {
    setTimeEntry(prev => ({ ...prev, [field]: time }));
  };

  const handleQuickSave = () => {
    if (timeEntry.start && timeEntry.end) {
      saveInlineEntry(selectedDate, timeEntry.start, timeEntry.end);
      setShowModal(false);
    } else {
      alert('يرجى إدخال وقت الدخول والخروج');
    }
  };

  const saveInlineEntry = async (date, start, end) => {
    console.log('Saving entry:', date, start, end);
    const dateObj = new Date(date);
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
    const daySchedule = schedule[dayKey];

    console.log('Day schedule:', dayKey, daySchedule);

    const userPhone = localStorage.getItem('userPhone');
    const existingRecord = attendance.find(a => a.date === date);
    const isOfficialHoliday = existingRecord?.isOfficialHoliday || false;

    const [ah, am] = start.split(':').map(Number);
    const [aeh, aem] = end.split(':').map(Number);
    const actualWorkMinutes = (aeh * 60 + aem) - (ah * 60 + am);

    let lateArrival = 0;
    let earlyDeparture = 0;
    let overtimeBefore = 0;
    let overtimeAfter = 0;
    let correctWorkMinutes = 0;
    let scheduledStart = '';
    let scheduledEnd = '';
    let scheduledHours = '';

    if (isOfficialHoliday && daySchedule) {
      scheduledStart = daySchedule.startTime;
      scheduledEnd = daySchedule.endTime;
      scheduledHours = calculateHours(daySchedule.startTime, daySchedule.endTime);
      const [sh, sm] = daySchedule.startTime.split(':').map(Number);
      const [eh, em] = daySchedule.endTime.split(':').map(Number);
      const scheduledMinutes = (eh * 60 + em) - (sh * 60 + sm);
      correctWorkMinutes = scheduledMinutes;
      overtimeBefore = 0;
      overtimeAfter = actualWorkMinutes;
    } else if (daySchedule) {
      const [sh, sm] = daySchedule.startTime.split(':').map(Number);
      const [eh, em] = daySchedule.endTime.split(':').map(Number);
      const scheduledWorkMinutes = (eh * 60 + em) - (sh * 60 + sm);

      lateArrival = Math.max(0, (ah * 60 + am) - (sh * 60 + sm));
      earlyDeparture = Math.max(0, (eh * 60 + em) - (aeh * 60 + aem));
      overtimeBefore = Math.max(0, (sh * 60 + sm) - (ah * 60 + am));
      overtimeAfter = Math.max(0, (aeh * 60 + aem) - (eh * 60 + em));
      
      const actualStart = Math.max(ah * 60 + am, sh * 60 + sm);
      const actualEnd = Math.min(aeh * 60 + aem, eh * 60 + em);
      correctWorkMinutes = Math.max(0, actualEnd - actualStart);
      
      scheduledStart = daySchedule.startTime;
      scheduledEnd = daySchedule.endTime;
      scheduledHours = calculateHours(daySchedule.startTime, daySchedule.endTime);
    } else {
      overtimeAfter = actualWorkMinutes;
      correctWorkMinutes = 0;
      scheduledStart = '-';
      scheduledEnd = '-';
      scheduledHours = '0:00';
    }

    const totalOvertime = overtimeBefore + overtimeAfter;

    console.log('Calculations:', {
      lateArrival,
      earlyDeparture,
      overtimeBefore,
      overtimeAfter,
      totalOvertime,
      correctWorkMinutes,
      isOfficialHoliday
    });

    await setDoc(doc(db, 'users', userPhone, 'attendance', date), {
      date,
      day: dayKey,
      scheduledStart,
      scheduledEnd,
      actualStart: start,
      actualEnd: end,
      workedHours: calculateHours(start, end),
      correctWorkHours: `${Math.floor(correctWorkMinutes / 60)}:${String(correctWorkMinutes % 60).padStart(2, '0')}`,
      scheduledHours,
      lateMinutes: lateArrival,
      earlyMinutes: earlyDeparture,
      overtimeBefore,
      overtimeAfter,
      overtimeMinutes: totalOvertime,
      isHoliday: !daySchedule,
      isOfficialHoliday,
      notes: isOfficialHoliday ? 'عطلة رسمية' : ''
    });

    console.log('Entry saved successfully');

    setShowModal(false);
    setSelectedDate('');
    setTimeEntry({ start: '', end: '', notes: '' });
    
    loadData();
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendance, filterType, currentPeriod, selectedMonth]);

  const getWorkingPeriod = () => {
    const referenceDate = new Date(selectedMonth);
    const currentDay = referenceDate.getDate();
    
    let startDate, endDate;
    
    if (currentDay >= 20) {
      startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 20);
      endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 19);
    } else {
      startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 20);
      endDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 19);
    }
    
    return { startDate, endDate };
  };

  const changeMonth = (direction) => {
    const newDate = new Date(selectedMonth);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedMonth(newDate);
  };

  const applyFilter = () => {
    let startDate, endDate;
    
    if (filterType === 'month') {
      const period = getWorkingPeriod();
      startDate = period.startDate;
      endDate = period.endDate;
    } else if (filterType === 'week') {
      startDate = new Date(currentPeriod);
      startDate.setDate(startDate.getDate() - startDate.getDay());
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
    } else {
      setFilteredAttendance(attendance);
      return;
    }
    
    const allDays = [];
    const currentDate = new Date(startDate);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][currentDate.getDay()];
      
      const existingRecord = attendance.find(a => a.date === dateStr);
      
      if (existingRecord) {
        allDays.push(existingRecord);
      } else {
        allDays.push({
          id: dateStr,
          date: dateStr,
          day: dayKey,
          isEmpty: true
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    setFilteredAttendance(allDays);
  };

  const loadData = async () => {
    const userPhone = localStorage.getItem('userPhone');
    console.log('Loading data for:', userPhone);
    
    const profileSnap = await getDocs(collection(db, 'users', userPhone, 'profile'));
    profileSnap.forEach(d => {
      if (d.id === 'info') {
        const data = d.data();
        setUserName(`${data.firstName} ${data.lastName}`);
      }
    });

    const scheduleSnap = await getDocs(collection(db, 'users', userPhone, 'workSchedule'));
    console.log('Schedule docs:', scheduleSnap.size);
    scheduleSnap.forEach(d => {
      console.log('Schedule doc:', d.id, d.data());
      if (d.id === 'schedule') {
        const scheduleData = d.data();
        console.log('Setting schedule:', scheduleData);
        setSchedule(scheduleData);
      }
    });

    const attendanceSnap = await getDocs(collection(db, 'users', userPhone, 'attendance'));
    const attendanceData = [];
    attendanceSnap.forEach(d => {
      attendanceData.push({ id: d.id, ...d.data() });
    });
    attendanceData.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAttendance(attendanceData);
  };

  const getDayName = (dayKey) => {
    const days = {
      sunday: 'الأحد',
      monday: 'الإثنين',
      tuesday: 'الثلاثاء',
      wednesday: 'الأربعاء',
      thursday: 'الخميس',
      friday: 'الجمعة',
      saturday: 'السبت'
    };
    return days[dayKey] || dayKey;
  };

  const calculateHours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const minutes = (eh * 60 + em) - (sh * 60 + sm);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };

  const handleOfficialHoliday = async (date) => {
    const dateObj = new Date(date);
    const dayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dateObj.getDay()];
    const daySchedule = schedule[dayKey];
    
    const userPhone = localStorage.getItem('userPhone');
    
    if (daySchedule) {
      const [sh, sm] = daySchedule.startTime.split(':').map(Number);
      const [eh, em] = daySchedule.endTime.split(':').map(Number);
      const scheduledMinutes = (eh * 60 + em) - (sh * 60 + sm);
      
      await setDoc(doc(db, 'users', userPhone, 'attendance', date), {
        date,
        day: dayKey,
        scheduledStart: daySchedule.startTime,
        scheduledEnd: daySchedule.endTime,
        actualStart: '',
        actualEnd: '',
        workedHours: '',
        correctWorkHours: `${Math.floor(scheduledMinutes / 60)}:${String(scheduledMinutes % 60).padStart(2, '0')}`,
        scheduledHours: calculateHours(daySchedule.startTime, daySchedule.endTime),
        lateMinutes: 0,
        earlyMinutes: 0,
        overtimeBefore: 0,
        overtimeAfter: 0,
        overtimeMinutes: 0,
        isHoliday: false,
        isOfficialHoliday: true,
        notes: 'عطلة رسمية'
      });
    }
    
    loadData();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('هل تريد حذف هذا السجل؟')) return;
    const userPhone = localStorage.getItem('userPhone');
    await deleteDoc(doc(db, 'users', userPhone, 'attendance', id));
    loadData();
  };

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.reload();
  };

  const handleExportExcel = () => {
    const exportData = [['التاريخ', 'اليوم', 'وقت الدخول', 'وقت الخروج', 'ساعات العمل', 'ملاحظات']];
    
    filteredAttendance.forEach(record => {
      const [year, month, day] = record.date.split('-');
      const dateStr = `${day}/${month}/${year}`;
      const dayName = getDayName(record.day);
      
      if (record.isEmpty) {
        exportData.push([
          dateStr,
          dayName,
          '',
          '',
          '',
          ''
        ]);
      } else {
        let notes = '';
        
        if (record.isHoliday) {
          const [sh, sm] = record.actualStart.split(':').map(Number);
          const [eh, em] = record.actualEnd.split(':').map(Number);
          const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
          const h = Math.floor(totalMinutes / 60);
          const m = totalMinutes % 60;
          notes = `إضافي ${h}:${String(m).padStart(2, '0')} ساعة (يوم عطلة) من ${record.actualStart} إلى ${record.actualEnd}`;
        } else {
          if (record.overtimeBefore > 0) {
            const h = Math.floor(record.overtimeBefore / 60);
            const m = record.overtimeBefore % 60;
            notes += `إضافي ${h}:${String(m).padStart(2, '0')} ساعة من ${record.actualStart} إلى ${record.scheduledStart}\n`;
          }
          if (record.overtimeAfter > 0) {
            const h = Math.floor(record.overtimeAfter / 60);
            const m = record.overtimeAfter % 60;
            notes += `إضافي ${h}:${String(m).padStart(2, '0')} ساعة من ${record.scheduledEnd} إلى ${record.actualEnd}`;
          }
        }
        
        exportData.push([
          dateStr,
          dayName,
          record.actualStart || '',
          record.actualEnd || '',
          record.workedHours || '',
          notes.trim()
        ]);
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'الدوام');
    
    const { startDate } = getWorkingPeriod();
    const fileName = `دوام_${startDate.getMonth() + 1}_${startDate.getFullYear()}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getTotalHours = () => {
    let totalLate = 0;
    let totalOvertime = 0;
    let totalCorrectWork = 0;
    let totalActualWork = 0;
    
    filteredAttendance.forEach(a => {
      if (!a.isEmpty) {
        totalLate += (a.lateMinutes || 0) + (a.earlyMinutes || 0);
        totalOvertime += a.overtimeMinutes || 0;
        
        if (a.correctWorkHours) {
          const [h, m] = a.correctWorkHours.split(':').map(Number);
          totalCorrectWork += h * 60 + m;
        }
        
        if (a.workedHours) {
          const [h, m] = a.workedHours.split(':').map(Number);
          totalActualWork += h * 60 + m;
        }
      }
    });
    
    const totalWorkMinutes = totalCorrectWork + totalOvertime;
    
    return { 
      totalLate, 
      totalOvertime, 
      totalCorrectWork,
      totalWorkMinutes,
      totalActualWork
    };
  };

  const getPeriodLabel = () => {
    if (filterType === 'month') {
      const { startDate, endDate } = getWorkingPeriod();
      const startStr = `${startDate.getDate()}/${startDate.getMonth() + 1}/${startDate.getFullYear()}`;
      const endStr = `${endDate.getDate()}/${endDate.getMonth() + 1}/${endDate.getFullYear()}`;
      return `من ${startStr} إلى ${endStr}`;
    } else if (filterType === 'week') {
      const startOfWeek = new Date(currentPeriod);
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      const startStr = `${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}/${startOfWeek.getFullYear()}`;
      const endStr = `${endOfWeek.getDate()}/${endOfWeek.getMonth() + 1}/${endOfWeek.getFullYear()}`;
      return `من ${startStr} إلى ${endStr}`;
    }
    return 'كل السجلات';
  };

  const totals = getTotalHours();

  return (
    <div className="attendance-table">
      <div className="table-header">
        <h2>جدول دوام {userName}</h2>
        <div className="header-actions">
          <button className="btn-download" onClick={handleExportExcel}>
            <IoDownload /> تحميل Excel
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            <IoLogOut /> تسجيل الخروج
          </button>
        </div>
      </div>

      <div className="filter-section">
        <div className="month-selector">
          <button onClick={() => changeMonth(-1)}><IoChevronForward /></button>
          <h3>{selectedMonth.getMonth() + 1}/{selectedMonth.getFullYear()}</h3>
          <button onClick={() => changeMonth(1)}><IoChevronBack /></button>
        </div>
        <div className="filter-buttons">
          <button 
            className={filterType === 'month' ? 'active' : ''}
            onClick={() => setFilterType('month')}
          >
            الشهر الحالي (20-19)
          </button>
          <button 
            className={filterType === 'week' ? 'active' : ''}
            onClick={() => setFilterType('week')}
          >
            الأسبوع
          </button>
          <button 
            className={filterType === 'custom' ? 'active' : ''}
            onClick={() => setFilterType('custom')}
          >
            كل السجلات
          </button>
        </div>
        <div className="period-label">{getPeriodLabel()}</div>
      </div>

      <table>
        <thead>
          <tr>
            <th>اليوم</th>
            <th>التاريخ</th>
            <th>الدخول</th>
            <th>الخروج</th>
            <th>ساعات الدوام</th>
            <th>ملاحظات</th>
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          {filteredAttendance.map(record => (
            <tr key={record.id} className={record.isEmpty ? 'empty-row' : ''}>
              <td>{getDayName(record.day)}</td>
              <td>
                {(() => {
                  const [year, month, day] = record.date.split('-');
                  return `${day}/${month}/${year}`;
                })()}
              </td>
              <td>
                {record.isEmpty ? (
                  <span className="empty-day-placeholder" onClick={() => openQuickEntry(record.date)}>
                    <IoAddCircle /> إضافة
                  </span>
                ) : record.isOfficialHoliday && !record.workedHours ? (
                  <span className="empty-day-placeholder" onClick={() => openQuickEntry(record.date)}>
                    <IoAddCircle /> إضافة
                  </span>
                ) : record.actualStart}
              </td>
              <td>
                {record.isEmpty ? (
                  <span className="empty-day-placeholder" onClick={() => openQuickEntry(record.date)}>
                    <IoAddCircle /> إضافة
                  </span>
                ) : record.isOfficialHoliday && !record.workedHours ? (
                  <span className="empty-day-placeholder" onClick={() => openQuickEntry(record.date)}>
                    <IoAddCircle /> إضافة
                  </span>
                ) : record.actualEnd}
              </td>
              <td>{record.workedHours || '-'}</td>
              <td>
                {!record.isEmpty && (
                  <>
                    {record.isOfficialHoliday && (
                      <div style={{marginBottom: '10px', fontWeight: 'bold', color: '#FF9800'}}>
                        عطلة رسمية
                      </div>
                    )}
                    {record.isHoliday && (
                      <div style={{marginBottom: '10px', fontWeight: 'bold', color: '#2196F3'}}>
                        يوم عطلة - كل الساعات إضافي
                      </div>
                    )}
                    {record.correctWorkHours && (
                      <div style={{marginBottom: '10px', fontWeight: 'bold', color: '#4CAF50'}}>
                        داوم {record.correctWorkHours} ساعة بالوقت الصحيح
                      </div>
                    )}
                    {record.isOfficialHoliday && record.overtimeAfter > 0 && (
                      <div className="note-overtime">
                        إضافي في العطلة الرسمية {Math.floor(record.overtimeAfter / 60)}:{String(record.overtimeAfter % 60).padStart(2, '0')} ساعة
                        <br />
                        (من {record.actualStart} إلى {record.actualEnd})
                      </div>
                    )}
                    {!record.isOfficialHoliday && record.overtimeBefore > 0 && (
                      <div className="note-overtime">
                        إضافي قبل الدوام {Math.floor(record.overtimeBefore / 60)}:{String(record.overtimeBefore % 60).padStart(2, '0')} ساعة
                        <br />
                        (من {record.actualStart} إلى {record.scheduledStart})
                      </div>
                    )}
                    {record.lateMinutes > 0 && (
                      <div className="note-late">
                        تأخير دخول {Math.floor(record.lateMinutes / 60)}:{String(record.lateMinutes % 60).padStart(2, '0')} ساعة
                        <br />
                        (إجازة ساعية من {record.scheduledStart} إلى {record.actualStart})
                      </div>
                    )}
                    {record.earlyMinutes > 0 && (
                      <div className="note-late">
                        خروج مبكر {Math.floor(record.earlyMinutes / 60)}:{String(record.earlyMinutes % 60).padStart(2, '0')} ساعة
                        <br />
                        (إجازة ساعية من {record.actualEnd} إلى {record.scheduledEnd})
                      </div>
                    )}
                    {!record.isOfficialHoliday && record.overtimeAfter > 0 && (
                      <div className="note-overtime">
                        إضافي بعد الدوام {Math.floor(record.overtimeAfter / 60)}:{String(record.overtimeAfter % 60).padStart(2, '0')} ساعة
                        <br />
                        (من {record.scheduledEnd} إلى {record.actualEnd})
                      </div>
                    )}
                    {record.notes && <div className="note-custom">{record.notes}</div>}
                  </>
                )}
              </td>
              <td>
                {record.isEmpty ? (
                  <button className="btn-holiday" onClick={() => handleOfficialHoliday(record.date)}>
                    <IoCalendar /> عطلة رسمية
                  </button>
                ) : record.isOfficialHoliday && !record.workedHours ? (
                  <button className="btn-holiday" onClick={() => handleOfficialHoliday(record.date)}>
                    <IoCalendar /> عطلة رسمية
                  </button>
                ) : (
                  <button className="btn-delete-small" onClick={() => handleDelete(record.id)}>
                    <IoTrash /> حذف
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="5"><strong>المجموع الكلي</strong></td>
            <td colSpan="2">
              <div style={{marginBottom: '8px'}}>
                <strong>مجموع ساعات الدوام:</strong> {Math.floor(totals.totalWorkMinutes / 60)}:{String(totals.totalWorkMinutes % 60).padStart(2, '0')} ساعة
              </div>
              <div style={{marginBottom: '8px', color: '#4CAF50'}}>
                دوام صحيح: {Math.floor(totals.totalCorrectWork / 60)}:{String(totals.totalCorrectWork % 60).padStart(2, '0')} ساعة
              </div>
              <div style={{marginBottom: '8px', color: '#FF9800'}}>
                إضافي: {Math.floor(totals.totalOvertime / 60)}:{String(totals.totalOvertime % 60).padStart(2, '0')} ساعة
              </div>
              <div style={{color: '#f44336'}}>
                تأخير: {Math.floor(totals.totalLate / 60)}:{String(totals.totalLate % 60).padStart(2, '0')} ساعة
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      {showModal && (
        <div className="modal" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>تسجيل الحضور - {selectedDate.split('-').reverse().join('/')}</h3>
            
            <div className="time-input-group">
              <div className="time-input-wrapper">
                <label>وقت الدخول</label>
                <input
                  type="time"
                  value={timeEntry.start}
                  onChange={(e) => setTimeEntry({ ...timeEntry, start: e.target.value })}
                />
                <div className="quick-time-buttons">
                  <button className="quick-time-btn" onClick={() => setQuickTime('start', '07:00')}>7:00</button>
                  <button className="quick-time-btn" onClick={() => setQuickTime('start', '08:00')}>8:00</button>
                  <button className="quick-time-btn" onClick={() => setQuickTime('start', '09:00')}>9:00</button>
                  <button className="quick-time-btn" onClick={() => setQuickTime('start', '13:00')}>1:00 PM</button>
                </div>
              </div>
              
              <div className="time-input-wrapper">
                <label>وقت الخروج</label>
                <input
                  type="time"
                  value={timeEntry.end}
                  onChange={(e) => setTimeEntry({ ...timeEntry, end: e.target.value })}
                />
                <div className="quick-time-buttons">
                  <button className="quick-time-btn" onClick={() => setQuickTime('end', '17:00')}>5:00 PM</button>
                  <button className="quick-time-btn" onClick={() => setQuickTime('end', '18:00')}>6:00 PM</button>
                  <button className="quick-time-btn" onClick={() => setQuickTime('end', '19:00')}>7:00 PM</button>
                  <button className="quick-time-btn" onClick={() => setQuickTime('end', '20:00')}>8:00 PM</button>
                </div>
              </div>
            </div>

            <textarea
              placeholder="ملاحظات (اختياري)"
              value={timeEntry.notes}
              onChange={(e) => setTimeEntry({ ...timeEntry, notes: e.target.value })}
            />
            
            <div className="modal-buttons">
              <button onClick={handleQuickSave}>حفظ</button>
              <button onClick={() => setShowModal(false)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttendanceTable;
