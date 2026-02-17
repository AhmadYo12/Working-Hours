import './ConfirmDialog.css';

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>{message}</h3>
        <div className="confirm-buttons">
          <button className="btn-confirm" onClick={onConfirm}>نعم</button>
          <button className="btn-cancel" onClick={onCancel}>لا</button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
