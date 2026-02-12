import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import PhoneLogin from './components/PhoneLogin';
import ProfileSetup from './components/ProfileSetup';
import WorkSchedule from './components/WorkSchedule';
import AttendanceTable from './components/AttendanceTable';
import AdminPanel from './components/AdminPanel';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(null);
  const [hasSchedule, setHasSchedule] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const adminStatus = localStorage.getItem('isAdmin');
        if (adminStatus === 'true') {
          setIsAdmin(true);
          setUser(currentUser);
          setHasProfile(true);
          setHasSchedule(true);
          setLoading(false);
        } else {
          const phoneNumber = localStorage.getItem('userPhone');
          if (phoneNumber) {
            await checkUserData(phoneNumber);
            setUser(currentUser);
          } else {
            setHasProfile(false);
            setHasSchedule(false);
          }
          setLoading(false);
        }
      } else {
        setUser(null);
        setHasProfile(false);
        setHasSchedule(false);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const checkUserData = async (phoneNumber) => {
    console.log('Checking user data for:', phoneNumber);
    try {
      const profileDoc = await getDoc(doc(db, 'users', phoneNumber, 'profile', 'info'));
      console.log('Profile exists:', profileDoc.exists());
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        console.log('Profile data:', data);
        if (data.isActive === false) {
          alert('تم إيقاف حسابك!');
          localStorage.clear();
          window.location.reload();
          return;
        }
        setHasProfile(true);
      } else {
        console.log('No profile found');
        setHasProfile(false);
      }
      
      const scheduleDoc = await getDoc(doc(db, 'users', phoneNumber, 'workSchedule', 'schedule'));
      console.log('Schedule exists:', scheduleDoc.exists());
      setHasSchedule(scheduleDoc.exists());
    } catch (error) {
      console.error('Error checking user data:', error);
      setHasProfile(false);
      setHasSchedule(false);
    }
  };

  if (loading) {
    return <div className="loading">جاري التحميل...</div>;
  }

  if (!user) return <PhoneLogin onLoginSuccess={async () => {
    const phoneNumber = localStorage.getItem('userPhone');
    if (phoneNumber) {
      await checkUserData(phoneNumber);
    }
    setUser(auth.currentUser);
  }} onAdminLogin={() => { setUser(auth.currentUser); setIsAdmin(true); }} />;
  
  if (isAdmin) return <AdminPanel />;
  
  if (!hasProfile) return <ProfileSetup onComplete={() => setHasProfile(true)} />;
  if (!hasSchedule) return <WorkSchedule onComplete={() => setHasSchedule(true)} />;
  
  return <AttendanceTable />;
}

export default App;
