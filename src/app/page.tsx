'use client';

export default function Home() {
  const hour = new Date().getHours();
  let greeting = 'Good Evening, Adam';
  if (hour < 12) {
    greeting = 'Good Morning, Adam';
  } else if (hour < 18) {
    greeting = 'Good Afternoon, Adam';
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <h1 className="text-5xl font-bold text-indigo-900">
        {greeting}
      </h1>
    </div>
  );
}
