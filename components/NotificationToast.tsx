import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from './Icons';

export type NotificationType = 'success' | 'error';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}

interface NotificationToastProps {
  notification: Notification;
  onClose: (id: number) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const { id, message, type } = notification;
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onClose(id), 300); // Allow time for exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, [id, onClose]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  const typeStyles = {
    success: {
      icon: <CheckCircleIcon className="w-6 h-6 text-bright-white" />,
      bg: 'bg-lucius-lime',
    },
    error: {
      icon: <XCircleIcon className="w-6 h-6 text-bright-white" />,
      bg: 'bg-red-500',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className={`relative flex items-center w-full max-w-sm p-4 rounded-lg shadow-lg text-bright-white overflow-hidden transform transition-all duration-300 ease-in-out ${styles.bg} ${exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}>
        <div className="flex-shrink-0 mr-3">
            {styles.icon}
        </div>
        <div className="flex-1">
            <p className="font-semibold">{message}</p>
        </div>
        <button onClick={handleClose} className="ml-4 p-1 rounded-full hover:bg-black/20">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
        </button>
    </div>
  );
};

export default NotificationToast;
