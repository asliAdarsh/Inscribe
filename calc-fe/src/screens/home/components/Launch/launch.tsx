import React from "react";
import { useNavigate } from "react-router-dom";
import * as ButtonImages from "../Button/button";
import "./launch.css";
import launchBG from "../Button/assets/launch.jpg";

const LaunchPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGuestSignIn = () => {
    // Set a guest flag in localStorage
    localStorage.setItem("userType", "guest");

    const mainContainer = document.getElementById("root") || document.body;
    mainContainer.classList.add("fade-out");
    // Navigate to the home page
    setTimeout(() => {
      navigate("/home");
      setTimeout(() => {
        mainContainer.classList.remove("fade-out");
      }, 50);
    }, 300);
  };

  const handleGoogleSignIn = () => {
    // In a real implementation, you would use the Google OAuth API
    // For now, we'll simulate the authentication flow
    
    // Show loading state
    const mainContainer = document.getElementById("root") || document.body;
    mainContainer.classList.add("loading");
    
    // Simulate authentication delay
    setTimeout(() => {
      // Store user info
      localStorage.setItem("userType", "google");
      localStorage.setItem("userEmail", "user@gmail.com");
      
      // Transition to home page
      mainContainer.classList.remove("loading");
      mainContainer.classList.add("fade-out");
      
      setTimeout(() => {
        navigate("/home");
        setTimeout(() => {
          mainContainer.classList.remove("fade-out");
        }, 50);
      }, 300);
    }, 1500);
    
    // In a real implementation, you would redirect to Google's OAuth endpoint:
    // window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=YOUR_REDIRECT_URI&response_type=code&scope=email profile';
  };

  return (
    <div className="min-h-screen bg-[#1a1b26] flex flex-col md:flex-row">
      {/* Left side - Sign in options */}
      <div className="w-full md:w-1/3 flex items-center justify-center p-8">
        <div className="bg-[#24273a] rounded-lg shadow-xl p-8 w-full max-w-md">
          <h2 className="text-2xl text-white text-center mb-6">Hi there!</h2>
          <p className="text-center text-gray-300 mb-8">
            Choose provider to Sign up
          </p>

          <div className="flex justify-center gap-4 mb-6">
            <button className="bg-[#1877f2] hover:bg-[#166fe5] text-white p-2 rounded-md w-12 h-12 flex items-center justify-center">
              <img
                src={
                  ButtonImages.facebookBtn
                }
                alt="Facebook"
                className="w-6 h-6"
              />
            </button>

            <button className="bg-[#fff] hover:bg-[#fff] text-white p-2 rounded-md w-12 h-12 flex items-center justify-center">
              <img
                src={
                  ButtonImages.gitImg
                }
                alt="GitHub"
                className="w-6 h-6"
              />
            </button>

            <button 
              onClick={handleGoogleSignIn}
              className="bg-white hover:bg-gray-100 p-2 rounded-md w-12 h-12 flex items-center justify-center"
            >
              <img
                src={
                  ButtonImages.googleImg
                }
                alt="Google"
                className="w-6 h-6"
              />
            </button>
          </div>

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-gray-400 text-sm">or</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          <button
            onClick={handleGuestSignIn}
            className="w-full bg-[#403d6a] hover:bg-[#2c2a46] text-white py-2 px-4 rounded-md transition-colors"
          >
            Continue as Guest
          </button>

          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{" "}
              <a
                href="#"
                onClick={() => navigate("/login")}
                className="text-blue-400 hover:underline"
              >
                Sign in
              </a>
            </p>
          </div>

          <div className="mt-8 text-xs text-gray-500 text-center">
            By continuing you are agreeing to our
            <br />
            <a href="#" className="text-gray-400 hover:underline">
              Terms of Use
            </a>{" "}
            and{" "}
            <a href="#" className="text-gray-400 hover:underline">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>

      {/* Right side - Welcome message and background */}
      <div
        className="hidden md:flex md:w-2/3 bg-cover bg-center items-center justify-center relative"
        style={{ backgroundImage: `url(${launchBG})` }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        <div className="relative z-10 text-white text-center p-8">
          <h1 className="text-6xl font-bold mb-4 font-handwriting">
            Welcome
            <br />
            to
            <br />
            INSCRIBE
          </h1>
          <p className="text-xl max-w-lg mx-auto">
            Your digital canvas for Notes and mathematical calculations
          </p>
        </div>
      </div>
    </div>
  );
};

export default LaunchPage;