import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import './AdminPanel.css';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.reload();
  };

  const loadUsers = async () => {
    setLoading(true);
    const usersData = [];
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'usersList'));
      console.log('Total users found:', usersSnapshot.size);
      
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('User:', doc.id, data);
        usersData.push({
          phoneNumber: doc.id,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          isActive: data.isActive !== false
        });
      });
      
      console.log('Users loaded:', usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
    
    setUsers(usersData);
    setLoading(false);
  };

  const toggleUserStatus = async (phoneNumber, currentStatus) => {
    await updateDoc(doc(db, 'users', phoneNumber, 'profile', 'info'), {
      isActive: !currentStatus
    });
    await updateDoc(doc(db, 'usersList', phoneNumber), {
      isActive: !currentStatus
    });
    loadUsers();
  };

  const deleteUser = async (phoneNumber) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return;
    
    await deleteDoc(doc(db, 'usersList', phoneNumber));
    await deleteDoc(doc(db, 'users', phoneNumber, 'profile', 'info'));
    
    const scheduleDoc = await getDocs(collection(db, 'users', phoneNumber, 'workSchedule'));
    scheduleDoc.forEach(async (d) => {
      await deleteDoc(doc(db, 'users', phoneNumber, 'workSchedule', d.id));
    });
    
    const attendanceDoc = await getDocs(collection(db, 'users', phoneNumber, 'attendance'));
    attendanceDoc.forEach(async (d) => {
      await deleteDoc(doc(db, 'users', phoneNumber, 'attendance', d.id));
    });
    
    loadUsers();
  };

  if (loading) return <div className="loading">جاري التحميل...</div>;

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>لوحة التحكم - الإدارة</h1>
        <button className="btn-logout" onClick={handleLogout}>تسجيل الخروج</button>
      </div>
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>رقم الهاتف</th>
              <th>الاسم الأول</th>
              <th>الاسم الأخير</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.phoneNumber}>
                <td>{user.phoneNumber}</td>
                <td>{user.firstName}</td>
                <td>{user.lastName}</td>
                <td>
                  <span className={`status ${user.isActive ? 'active' : 'inactive'}`}>
                    {user.isActive ? 'نشط' : 'موقوف'}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-toggle"
                    onClick={() => toggleUserStatus(user.phoneNumber, user.isActive)}
                  >
                    {user.isActive ? 'إيقاف' : 'تفعيل'}
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => deleteUser(user.phoneNumber)}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="no-users">لا يوجد مستخدمين</p>}
      </div>
    </div>
  );
}

export default AdminPanel;
