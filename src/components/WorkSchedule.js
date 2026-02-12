import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './WorkSchedule.css';

function WorkSchedule({ onComplete }) {
  const days = [
    { key: 'saturday', name: 'السبت' },
    { key: 'sunday', name: 'الأحد' },
    { key: 'monday', name: 'الإثنين' },
    { key: 'tuesday', name: 'الثلاثاء' },
    { key: 'wednesday', name: 'الأربعاء' },
    { key: 'thursday', name: 'الخميس' },
    { key: 'friday', name: 'الجمعة' }
  ];

  const [schedule, setSchedule] = useState({});

  const toggleDay = (dayKey) => {
    if (schedule[dayKey]) {
      const newSchedule = { ...schedule };
      delete newSchedule[dayKey];
      setSchedule(newSchedule);
    } else {
      setSchedule({ ...schedule, [dayKey]: { startTime: '09:00', endTime: '17:00' } });
    }
  };

  const updateTime = (dayKey, field, value) => {
    setSchedule({
      ...schedule,
      [dayKey]: { ...schedule[dayKey], [field]: value }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userPhone = localStorage.getItem('userPhone');
    await setDoc(doc(db, 'users', userPhone, 'workSchedule', 'schedule'), schedule);
    onComplete();
  };

  return (
    <div className="work-schedule">
      <h2>حدد أيام دوامك</h2>
      <form onSubmit={handleSubmit}>
        {days.map(day => (
          <div key={day.key} className="day-item">
            <label>
              <input
                type="checkbox"
                checked={!!schedule[day.key]}
                onChange={() => toggleDay(day.key)}
              />
              <span>{day.name}</span>
            </label>
            {schedule[day.key] && (
              <div className="time-inputs">
                <input
                  type="time"
                  value={schedule[day.key].startTime}
                  onChange={(e) => updateTime(day.key, 'startTime', e.target.value)}
                />
                <span>إلى</span>
                <input
                  type="time"
                  value={schedule[day.key].endTime}
                  onChange={(e) => updateTime(day.key, 'endTime', e.target.value)}
                />
              </div>
            )}
          </div>
        ))}
        <button type="submit" disabled={Object.keys(schedule).length === 0}>
          حفظ والمتابعة
        </button>
      </form>
    </div>
  );
}

export default WorkSchedule;
