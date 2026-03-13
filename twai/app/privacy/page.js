'use client';

import Link from 'next/link';

const PrivacyPolicy = () => {
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
          <nav className="flex space-x-4">
            <Link 
              href="/" 
              className="px-4 py-2 rounded-md font-medium transition-all duration-200"
              style={{ 
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Home
            </Link>
            <Link 
              href="/terms" 
              className="px-4 py-2 rounded-md font-medium transition-all duration-200"
              style={{ 
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Terms of Service
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow flex pt-20 p-4" style={{ background: `linear-gradient(to bottom, #0c0d10, #111826)` }}>
        <div className="container mx-auto py-8 px-4">
          <div className="relative overflow-hidden rounded-2xl shadow-2xl mb-8" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${jarwiz[600]}, ${accentColor}, ${jarwiz[500]})` }}></div>
            <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(to right, ${jarwiz[500]}, ${accentColor}, ${jarwiz[600]})` }}></div>
            <div className="absolute top-0 left-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, ${jarwiz[600]}, ${accentColor}, ${jarwiz[500]})` }}></div>
            <div className="absolute top-0 right-0 bottom-0 w-1" style={{ background: `linear-gradient(to bottom, ${jarwiz[500]}, ${accentColor}, ${jarwiz[600]})` }}></div>

            <div className="backdrop-blur-sm p-10" style={{ backgroundColor: 'rgba(28, 32, 41, 0.85)', color: 'hsl(var(--card-foreground))' }}>
              <div className="relative z-10">
                <div className="mb-8" style={{ animation: 'fade-up 0.5s ease-out' }}>
                  <h1 className="text-4xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${jarwiz[400]}, ${accentColor})` }}>
                    Privacy Policy
                  </h1>
                </div>

                <div className="space-y-6 relative">
                  <p className="text-lg opacity-90" style={{ color: 'hsl(var(--foreground))' }}>
                    Last Updated: April 15, 2025
                  </p>

                  <div className="h-px w-full mx-auto my-6" style={{ background: `linear-gradient(to right, transparent, ${jarwiz[500]}/50, transparent)` }}></div>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>1. Introduction</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      JarwizAI respects your privacy and is committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>2. Data We Collect</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      We may collect, use, store and transfer different kinds of personal data about you including identity data, contact data, technical data, usage data, and marketing and communications data.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>3. How We Use Your Data</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      We will only use your personal data when the law allows us to. Most commonly, we will use your personal data to provide you with our services, to manage our relationship with you, and to improve our website and services.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>4. Data Security</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way, altered, or disclosed.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>5. Data Retention</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      We will only retain your personal data for as long as necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, accounting, or reporting requirements.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>6. Your Legal Rights</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, or erasure of your personal data.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>7. Third-Party Links</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      Our website may include links to third-party websites, plug-ins, and applications. Clicking on those links or enabling those connections may allow third parties to collect or share data about you. We do not control these third-party websites and are not responsible for their privacy statements.
                    </p>
                  </section>

                  <section className="mb-8">
                    <h2 className="text-2xl font-bold mb-4" style={{ color: jarwiz[300] }}>8. Changes to the Privacy Policy</h2>
                    <p className="mb-4" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      We may update our privacy policy from time to time. We will notify you of any changes by posting the new privacy policy on this page.
                    </p>
                  </section>

                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${jarwiz[600]}/15` }}></div>
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl" style={{ backgroundColor: `${accentColor}/15` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="py-6 px-4" style={{ backgroundColor: '#000000' }}>
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center mb-4 md:mb-0">
            <Link href="/" className="text-xl font-extrabold" style={{ textDecoration: 'none' }}>
              <span style={{ color: jarwiz[600] }}>Jar</span>
              <span style={{ color: jarwiz[500] }}>wiz</span>
              <span style={{ color: accentColor, fontWeight: 'bold' }}>AI</span>
            </Link>
            <span className="ml-2 text-sm opacity-70">© 2025 All Rights Reserved</span>
          </div>
          <div className="flex space-x-4">
            <Link href="/terms" className="text-sm hover:underline" style={{ color: jarwiz[300] }}>
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-sm hover:underline" style={{ color: jarwiz[300] }}>
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>

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
        }

        @keyframes fade-in {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        .container {
          @apply w-full;
          @apply max-w-4xl;
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        @media (min-width: 640px) {
          .container {
            max-width: 640px;
          }
        }

        @media (min-width: 768px) {
          .container {
            max-width: 768px;
          }
        }

        @media (min-width: 1024px) {
          .container {
            max-width: 1024px;
          }
        }

        @media (min-width: 1280px) {
          .container {
            max-width: 1280px;
          }
        }

        @media (min-width: 1536px) {
          .container {
            max-width: 1536px;
          }
        }
      `}</style>
    </div>
  );
};

export default PrivacyPolicy;