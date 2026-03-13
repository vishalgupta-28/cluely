'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';

const Welcome = () => {
  const jarwiz = {
    50: '#f0f7ff',
    100: '#e0eefe',
    200: '#bae0fe',
    300: '#7ac7fd',
    400: '#36a9fa',
    500: '#0c8eeb',
    600: '#0070cc',
    700: '#0058a6',
    800: '#064b87',
    900: '#0b3e6f',
    950: '#082649',
  };

  const accentColor = 'hsl(var(--accent))';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0c0d10', color: 'hsl(var(--foreground))' }}>
      <header className="fixed top-0 left-0 right-0 z-50 py-2" style={{ backgroundColor: '#000000' }}>
        <div className="container mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-extrabold" style={{ textDecoration: 'none' }}>
              <span style={{ color: jarwiz[600] }}>Jar</span>
              <span style={{ color: jarwiz[500] }}>wiz</span>
              <span style={{ color: accentColor, fontWeight: 'bold' }}>AI</span>
            </Link>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="px-4 py-2 rounded-md font-medium transition-all duration-200"
            style={{ 
              backgroundColor: jarwiz[600], 
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              backgroundImage: `linear-gradient(to right, ${jarwiz[600]}, ${jarwiz[500]})`
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 8px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4" style={{ background: `linear-gradient(to bottom, #0c0d10, #111826)` }}>
        <div className="w-full max-w-lg">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${jarwiz[600]}, ${accentColor}, ${jarwiz[500]})` }}></div>
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${jarwiz[500]}, ${accentColor}, ${jarwiz[600]})` }}></div>
            <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, ${jarwiz[600]}, ${accentColor}, ${jarwiz[500]})` }}></div>
            <div className="absolute top-0 right-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, ${jarwiz[500]}, ${accentColor}, ${jarwiz[600]})` }}></div>

            <div className="backdrop-blur-sm p-10" style={{ backgroundColor: 'rgba(28, 32, 41, 0.85)', color: 'hsl(var(--card-foreground))' }}>
              <div className="relative z-10">
                <div className="mb-8" style={{ animation: 'fade-up 0.5s ease-out' }}>
                  <h1 className="text-4xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${jarwiz[400]}, ${accentColor})` }}>
                    Welcome!
                  </h1>
                </div>

                <div className="space-y-6 relative">
                  <p className="text-xl font-medium opacity-90 delay-100" style={{ color: 'hsl(var(--foreground))', animation: 'fade-in 0.5s ease-out 0.1s' }}>
                    Thank you for joining JarwizAI
                  </p>

                  <div className="h-px w-24 mx-auto my-6" style={{ background: `linear-gradient(to right, transparent, ${jarwiz[500]}/50, transparent)` }}></div>

                  <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))', animation: 'fade-in 0.5s ease-out 0.2s' }}>
                    We&apos;ll be in touch with you soon.
                  </p>

                  <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))', animation: 'fade-in 0.5s ease-out 0.3s' }}>
                    We&apos;re crafting something <span className="font-semibold animate-pulse" style={{ color: accentColor }}>extraordinary</span>.
                  </p>

                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${jarwiz[600]}/15` }}></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${accentColor}/15` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        :root {
          --background: #0c0d10;
          --foreground: 0 0% 98%;
          --card: 26, 29, 37;  /* RGB values from the image */
          --card-foreground: 0 0% 98%;
          --popover: 240 10% 3.9%;
          --popover-foreground: 0 0% 98%;
          --primary: 210 100% 50%;
          --primary-foreground: 210 40% 98%;
          --secondary: 240 10% 15%;
          --secondary-foreground: 0 0% 98%;
          --muted: 240 10% 15%;
          --muted-foreground: 240 5% 75%;
          --accent: 320 90% 60%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 84.2% 60.2%;
          --destructive-foreground: 210 40% 98%;
          --border: 240 10% 15%;
          --input: 240 10% 15%;
          --ring: 240 10% 30%;
          --radius: 0.5rem;
          --sidebar-background: 240 10% 3%;
          --sidebar-foreground: 240 5% 90%;
          --sidebar-primary: 210 100% 50%;
          --sidebar-primary-foreground: 0 0% 98%;
          --sidebar-accent: 240 10% 15%;
          --sidebar-accent-foreground: 240 5% 90%;
          --sidebar-border: 240 10% 15%;
          --sidebar-ring: 210 100% 50%;
        }

        .dark {
          --background: 240 10% 3.9%;
          --foreground: 0 0% 98%;
          --card: 240 10% 3.9%;
          --card-foreground: 0 0% 98%;
          --popover: 240 10% 3.9%;
          --popover-foreground: 0 0% 98%;
          --primary: 210 100% 50%;
          --primary-foreground: 0 0% 98%;
          --secondary: 240 10% 15.9%;
          --secondary-foreground: 0 0% 98%;
          --muted: 240 10% 15.9%;
          --muted-foreground: 240 5% 75%;
          --accent: 320 90% 60%;
          --accent-foreground: 0 0% 98%;
          --destructive: 0 62.8% 30.6%;
          --destructive-foreground: 0 0% 98%;
          --border: 240 10% 20%;
          --input: 240 10% 20%;
          --ring: 240 10% 30%;
          --sidebar-background: 240 10% 5%;
          --sidebar-foreground: 240 5% 90%;
          --sidebar-primary: 210 100% 50%;
          --sidebar-primary-foreground: 0 0% 98%;
          --sidebar-accent: 240 10% 15%;
          --sidebar-accent-foreground: 240 5% 90%;
          --sidebar-border: 240 10% 20%;
          --sidebar-ring: 210 100% 50%;
        }

        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        .animate-fade-up {
          animation: fade-up 0.5s ease-out;
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: .8;
          }
        }

        .container {
          @apply w-full;
          @apply max-w-2xl;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        @media (min-width: 640px) {
          .container {
            max-w-md;
          }
        }

        @media (min-width: 768px) {
          .container {
            max-w-lg;
          }
        }

        @media (min-width: 1024px) {
          .container {
            max-w-xl;
          }
        }

        @media (min-width: 1280px) {
          .container {
            max-w-2xl;
          }
        }

        @media (min-width: 1536px) {
          .container {
            max-w-3xl;
          }
        }
      `}</style>
    </div>
  );
};

export default Welcome;
