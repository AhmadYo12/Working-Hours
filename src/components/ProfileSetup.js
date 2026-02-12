import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import './ProfileSetup.css';

function ProfileSetup({ onComplete }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const userPhone = localStorage.getItem('userPhone');
    console.log('Saving profile for:', userPhone);
    
    try {
      await setDoc(doc(db, 'users', userPhone, 'profile', 'info'), {
        firstName,
        lastName,
        isActive: true,
        createdAt: new Date()
      });
      
      await setDoc(doc(db, 'usersList', userPhone), {
        phoneNumber: userPhone,
        firstName,
        lastName,
        isActive: true,
        createdAt: new Date()
      });
      
      console.log('Profile saved successfully');
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('خطأ في حفظ البيانات: ' + error.message);
    }
  };

  return (
    <div className="profile-setup">
      <h2>أهلاً بك!</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="الاسم الأول"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="الاسم الأخير"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
        <button type="submit">التالي</button>
      </form>
    </div>
  );
}

export default ProfileSetup;
