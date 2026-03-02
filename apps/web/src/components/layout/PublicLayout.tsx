import LoginPage from '../../pages/LoginPage';

const PublicLayout = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f3f4f6',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          boxShadow:
            '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.1)',
          border: '1px solid #e5e7eb',
        }}
      >
        <LoginPage />
      </div>
    </div>
  );
};

export default PublicLayout;
