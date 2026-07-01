export default function Home() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening, Adam';
  if (hour < 12) {
    greeting = 'Good Morning, Adam';
  } else if (hour < 18) {
    greeting = 'Good Afternoon, Adam';
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #f3f4f6 0%, #e0e7ff 100%)' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', color: '#1e1b4b' }}>
        {greeting}
      </h1>
    </div>
  );
}
