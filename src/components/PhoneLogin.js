import { useState, useEffect } from "react";
import { signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";
import { IoPhonePortrait, IoLockClosed, IoLogIn, IoRocketSharp } from "react-icons/io5";
import Toast from './Toast';
import "./PhoneLogin.css";

function PhoneLogin({ onLoginSuccess, onAdminLogin }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });
  const [toast, setToast] = useState(null);
  const [gun, setGun] = useState({ x: 100, y: -100, grabbed: false });
  const [bullets, setBullets] = useState([]);
  const [buttonHealth, setButtonHealth] = useState(20);
  const [buttonDodgePosition, setButtonDodgePosition] = useState({ x: 0, y: 0 });
  const [buttonPermanentPosition, setButtonPermanentPosition] = useState({ x: 0, y: 0 });

  const isFormValid = () => {
    return phoneNumber.length === 10 && password.length >= 8;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (!gun.grabbed) {
        setGun(prev => {
          const newY = prev.y + 2;
          if (newY > window.innerHeight) {
            return { x: Math.random() * (window.innerWidth - 50), y: -100, grabbed: false };
          }
          return { ...prev, y: newY };
        });
      }
    }, 50);
    return () => clearInterval(interval);
  }, [gun.grabbed]);

  const handleMouseMove = (e) => {
    if (gun.grabbed) {
      setGun({ ...gun, x: e.clientX - 25, y: e.clientY - 25 });
    }
  };

  const handleGunClick = () => {
    if (!gun.grabbed && gun.y > 0) {
      setGun({ ...gun, grabbed: true });
    }
  };

  const handleShoot = (e) => {
    if (gun.grabbed && e.button === 0) {
      const newBullet = { id: Date.now(), x: gun.x + 25, y: gun.y };
      setBullets(prev => [...prev, newBullet]);
      
      setTimeout(() => {
        setBullets(prev => prev.filter(b => b.id !== newBullet.id));
      }, 3000);
    }
    if (e.button === 2) {
      setGun({ ...gun, grabbed: false });
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setBullets(prev => prev.map(b => ({ ...b, y: b.y - 10 })));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    bullets.forEach(bullet => {
      const buttonEl = document.querySelector('.login-card button[type="submit"]');
      if (buttonEl && buttonHealth > 0) {
        const rect = buttonEl.getBoundingClientRect();
        if (bullet.x > rect.left && bullet.x < rect.right && bullet.y > rect.top && bullet.y < rect.bottom) {
          const hitChance = Math.random();
          if (hitChance < 0.5) {
            setButtonHealth(prev => {
              const newHealth = Math.max(0, prev - 1);
              if (newHealth === 0) {
                setTimeout(() => {
                  setButtonPermanentPosition({ x: 0, y: 0 });
                  setButtonDodgePosition({ x: 0, y: 0 });
                  setButtonPosition({ top: 0, left: 0 });
                }, 100);
              }
              return newHealth;
            });
            setBullets(prev => prev.filter(b => b.id !== bullet.id));
          } else if (hitChance < 0.75) {
            const dodgeX = (Math.random() - 0.5) * 200;
            const dodgeY = Math.random() * -100 - 50;
            setButtonDodgePosition({ x: dodgeX, y: dodgeY });
            setTimeout(() => setButtonDodgePosition({ x: 0, y: 0 }), 150);
            setBullets(prev => prev.filter(b => b.id !== bullet.id));
          } else {
            const loginCard = document.querySelector('.login-card');
            const cardRect = loginCard.getBoundingClientRect();
            const maxX = (cardRect.width - rect.width) / 2;
            const newX = (Math.random() - 0.5) * maxX * 2;
            const newY = Math.random() * -150 - 50;
            setButtonPermanentPosition({ x: newX, y: newY });
            setBullets(prev => prev.filter(b => b.id !== bullet.id));
          }
        }
      }
    });
  }, [bullets, buttonHealth]);

  const handleButtonHover = (e) => {
    if (!isFormValid() && buttonHealth > 0) {
      const button = e.currentTarget;
      const buttonRect = button.getBoundingClientRect();
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;

      const deltaX = mouseX - buttonCenterX;
      const deltaY = mouseY - buttonCenterY;

      const moveX = -deltaX * 2;
      const moveY = -deltaY * 2;

      setButtonPosition({ top: moveY, left: moveX });
    }
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value.length <= 10) {
      setPhoneNumber(value);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (phoneNumber === "0987654321" && password === "password") {
      try {
        await signInAnonymously(auth);
        localStorage.clear();
        localStorage.setItem("isAdmin", "true");
        console.log("Admin logged in");
        onAdminLogin();
      } catch (error) {
        console.error("Admin login error:", error);
        setToast({ message: 'خطأ: ' + error.message, type: 'error' });
      }
      return;
    }

    if (password !== "12345678") {
      setToast({ message: 'كلمة السر خاطئة!', type: 'error' });
      return;
    }

    if (!phoneNumber.startsWith("09") || phoneNumber.length !== 10) {
      setToast({ message: 'رقم الهاتف يجب أن يبدأ بـ 09 ويتكون من 10 أرقام!', type: 'error' });
      return;
    }

    try {
      await signInAnonymously(auth);
      localStorage.clear();
      localStorage.setItem("userPhone", phoneNumber);
      console.log("User logged in:", phoneNumber);
      onLoginSuccess();
    } catch (error) {
      console.error("Login error:", error);
      setToast({ message: 'خطأ: ' + error.message, type: 'error' });
    }
  };

  return (
    <div className="phone-login" onMouseMove={handleMouseMove} onMouseDown={handleShoot} onContextMenu={(e) => e.preventDefault()}>
      {gun.y > -50 && (
        <div 
          className="gun" 
          style={{ left: gun.x, top: gun.y, cursor: gun.grabbed ? 'none' : 'pointer' }}
          onClick={handleGunClick}
        >
          <IoRocketSharp style={{ fontSize: '50px', color: '#667eea', transform: 'rotate(-45deg)' }} />
        </div>
      )}
      {bullets.map(bullet => (
        <div key={bullet.id} className="bullet" style={{ left: bullet.x, top: bullet.y }}>•</div>
      ))}
      <div className="login-card">
        <h2>تسجيل الدخول</h2>
        <form onSubmit={handleLogin}>
          <div className="input-group">
            <IoPhonePortrait className="input-icon" />
            <input
              type="tel"
              placeholder="09xxxxxxxx"
              value={phoneNumber}
              onChange={handlePhoneChange}
              maxLength="10"
              required
            />
          </div>
          <div className="input-group">
            <IoLockClosed className="input-icon" />
            <input
              type="password"
              placeholder="كلمة السر"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            onMouseMove={handleButtonHover}
            style={{
              ...(!isFormValid() && buttonHealth > 0 ? {
                transform: `translate(${buttonPosition.left + buttonDodgePosition.x + buttonPermanentPosition.x}px, ${buttonPosition.top + buttonDodgePosition.y + buttonPermanentPosition.y}px)`,
                transition: "transform 0.05s ease",
              } : {
                transform: `translate(${buttonDodgePosition.x + buttonPermanentPosition.x}px, ${buttonDodgePosition.y + buttonPermanentPosition.y}px)`,
                transition: "transform 0.1s ease"
              }),
              background: `linear-gradient(90deg, #1a1a2e 0%, #1a1a2e ${(1 - buttonHealth / 20) * 100}%, #667eea ${(1 - buttonHealth / 20) * 100}%, #764ba2 100%)`,
              transition: 'background 0.3s ease, transform 0.1s ease'
            }}
          >
            {buttonHealth === 0 && <span style={{ marginLeft: '8px' }}>☠️</span>}
            <IoLogIn /> دخول
          </button>
        </form>
      </div>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}

export default PhoneLogin;
