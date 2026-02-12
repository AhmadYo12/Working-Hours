import { useEffect } from "react";
import { IoCheckmarkCircle, IoCloseCircle, IoWarning } from "react-icons/io5";
import "./Toast.css";

function Toast({ message, type = "error", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <IoCheckmarkCircle />,
    error: <IoCloseCircle />,
    warning: <IoWarning />,
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

export default Toast;
