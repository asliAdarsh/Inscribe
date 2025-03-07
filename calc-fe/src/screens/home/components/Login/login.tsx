import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import launchBG from "../Button/assets/launch.jpg"

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate inputs
    if (!email || !password) {
      setError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    try {
      // Here you would normally connect to your authentication API
      // For now, we'll simulate a login with a timeout
      setTimeout(() => {
        // Successful login simulation
        localStorage.setItem('userType', 'registered');
        
        // Transition effect
        const mainContainer = document.getElementById('root') || document.body;
        mainContainer.classList.add('fade-out');
        
        setTimeout(() => {
          navigate('/home');
          setTimeout(() => {
            mainContainer.classList.remove('fade-out');
          }, 50);
        }, 300);
      }, 1000);
    } catch (err) {
      setError('Login failed. Please check your credentials.');
      setIsLoading(false);
    }
  };

  const handleBackToLaunch = () => {
    const mainContainer = document.getElementById('root') || document.body;
    mainContainer.classList.add('fade-out');
    
    setTimeout(() => {
      navigate('/');
      setTimeout(() => {
        mainContainer.classList.remove('fade-out');
      }, 50);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col md:flex-row">
      {/* Left side - Login form */}
      <div className="w-full md:w-1/3 flex items-center justify-center p-8">
        <div className="bg-[#24273a] rounded-lg shadow-xl p-8 w-full max-w-md">
          <h2 className="text-2xl text-white text-center mb-6">Welcome Back</h2>
          <p className="text-center text-gray-300 mb-8">Sign in to your account</p>
          
          {error && (
            <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-300 mb-2">Email</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1b26] text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
              />
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block text-gray-300 mb-2">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#1a1b26] text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="mr-2 accent-[#403d6a]"
                />
                <label htmlFor="remember" className="text-gray-300 text-sm">Remember me</label>
              </div>
              <a href="#" className="text-blue-400 text-sm hover:underline">Forgot password?</a>
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-[#403d6a] hover:bg-[#2c2a46] text-white py-2 px-4 rounded-md transition-colors ${
                isLoading ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Don't have an account? <a href="#" onClick={handleBackToLaunch} className="text-blue-400 hover:underline">Sign up</a>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right side - Welcome message and background */}
      <div className="hidden md:flex md:w-2/3 bg-cover bg-center items-center justify-center relative" style={{ backgroundImage: `url(${launchBG})` }}>
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 text-white text-center p-8">
          <h1 className="text-6xl font-bold mb-4 font-handwriting">
            Welcome
            <br />
            Back to
            <br />
            INSCRIBE
          </h1>
          <p className="text-xl max-w-lg mx-auto">
            Continue your journey with mathematical calculations and note-taking
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;