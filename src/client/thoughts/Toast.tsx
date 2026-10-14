type ToastProps = {
  message: string | null;
};

export const Toast = ({ message }: ToastProps) => (
  <div className={`toast${message ? ' show' : ''}`} role="status">
    {message}
  </div>
);
