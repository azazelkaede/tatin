import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ||
  (import.meta.env.DEV ? '/api' : '');
const API_CONFIGURED = Boolean(API_BASE_URL);

async function requestApi(path, options) {
  if (!API_CONFIGURED) {
    throw new Error('Student services are not connected. Your information was not submitted.');
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error('Could not reach student services. Check that the PHP API is deployed and available.');
  }

  try {
    return { response, result: await response.json() };
  } catch {
    throw new Error('Student services returned an invalid response. Check the API URL and deployment.');
  }
}

function PasswordVisibilityToggle({ visible, onToggle }) {
  const label = visible ? 'Hide passcode' : 'Show passcode';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={visible}
      title={label}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-orange-400 transition-colors hover:text-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.7">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.5-7 9.75-7 9.75 7 9.75 7-3.5 7-9.75 7-9.75-7-9.75-7Z" />
        <circle cx="12" cy="12" r="3" />
        {visible && <path strokeLinecap="round" d="m4 4 16 16" />}
      </svg>
    </button>
  );
}

function App() {
  // SECURE DEFAULT: Now starts on 'login' instead of 'dashboard'
  const [currentView, setCurrentView] = useState('login');
  
  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem('starkCart');
    if (!savedCart) return [];
    try {
      const parsedCart = JSON.parse(savedCart);
      return Array.isArray(parsedCart) ? parsedCart : [];
    } catch {
      return [];
    }
  });
  
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [transmitStatus, setTransmitStatus] = useState('idle');
  const [transmitMessage, setTransmitMessage] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [cartMessage, setCartMessage] = useState('');
  const [photoMessage, setPhotoMessage] = useState('');
  const feePerUnit = 850;
  const payloadLimit = 27;

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profile, setProfile] = useState({ name: '', id: '', course: '', age: '', location: '', email: '' });
  const [profileImage, setProfileImage] = useState(null);

  useEffect(() => {
    localStorage.removeItem('starkProfile');
    for (const key of Object.keys(localStorage)) {
      if (key === 'starkProfileImage' || key.startsWith('starkProfileImage:')) {
        localStorage.removeItem(key);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('starkCart', JSON.stringify(cart));
  }, [cart]);

  const availableSubjects = [
    { code: 'ITPD4', desc: 'Software Engineering', units: 3, time: 'MWF 9:00-10:00 AM' },
    { code: 'ITPC2', desc: 'Database System', units: 3, time: 'TTH 1:00-2:30 PM' },
    { code: 'ITPC6', desc: 'Information Assurance and Security', units: 3, time: 'MWF 1:00-2:00 PM' },
    { code: 'ITPD2', desc: 'Design UI', units: 3, time: 'TTH 8:30-10:00 AM' },
    { code: 'ITNET2', desc: 'Networking 2', units: 3, time: 'MWF 3:00-4:30 PM' },
    { code: 'ITNET4', desc: 'Networking 4', units: 3, time: 'SAT 8:00-11:00 AM' },
    { code: 'ITCC212', desc: 'Cyber Security', units: 6, time: 'MTWTHF 8:00-5:00 PM' },
    { code: 'ITPE1', desc: 'Seminars and Field Trips', units: 3, time: 'SAT 1:00-4:00 PM' },
    { code: 'ITPE2', desc: 'Advanced Cybersecurity', units: 3, time: 'TTH 4:30-6:00 PM' },
    { code: 'ITGE1', desc: 'Blockchain Technologies', units: 3, time: 'MWF 5:30-6:30 PM' }
  ];

  const addSubject = (subject) => {
    if (cart.some((item) => item.code === subject.code)) return;
    if (totalUnits + subject.units > payloadLimit) {
      setCartMessage(`${subject.code} would exceed the ${payloadLimit}-unit limit. Remove a subject first.`);
      return;
    }
    setCart((currentCart) => [...currentCart, subject]);
    setCartMessage(`${subject.code} added to your enrollment.`);
  };
  const removeSubject = (code) => {
    setCart((currentCart) => currentCart.filter((item) => item.code !== code));
    setCartMessage(`${code} removed from your enrollment.`);
  };
  const totalUnits = cart.reduce((sum, subject) => sum + subject.units, 0);
  const totalAssessment = totalUnits * feePerUnit;
  const filteredSubjects = availableSubjects.filter((subject) =>
    `${subject.code} ${subject.desc} ${subject.time}`.toLowerCase().includes(subjectSearch.trim().toLowerCase())
  );

  const handleTransmit = async () => {
    setTransmitStatus('transmitting');
    setTransmitMessage('');
    try {
      const { response, result } = await requestApi('/enroll.php', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjects: cart.map((subject) => subject.code) }),
      });
      if (!response.ok || result.status !== 'success') {
        throw new Error(result.message || 'Enrollment could not be saved.');
      }

      setTransmitStatus('success');
      setTimeout(() => {
        setCart([]);
        setTransmitStatus('idle');
      }, 3000);
    } catch (error) {
      console.error('Enrollment request failed:', error);
      setTransmitMessage(error.message || 'Could not reach the enrollment API.');
      setTransmitStatus('error');
    }
  };

  const handleLogoutConfirm = async () => {
    try {
      await requestApi('/logout.php', { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    setShowLogoutModal(false);
    setCart([]);
    setProfile({ name: '', id: '', course: '', age: '', location: '', email: '' });
    setProfileImage(null);
    setCurrentView('login');
  };

  const handleProfileChange = (e) => {
    const updatedProfile = { ...profile, [e.target.name]: e.target.value.toUpperCase() };
    setProfile(updatedProfile);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoMessage('Choose an image smaller than 2 MB.');
      e.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('photo', file);
    setPhotoMessage('Saving photo...');
    requestApi('/profile-photo.php', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
      .then(({ response, result }) => {
        if (!response.ok || result.status !== 'success') {
          throw new Error(result.message || 'Could not save the photo.');
        }
        setProfileImage(result.dataUrl);
        setPhotoMessage('Photo saved to your student profile.');
      })
      .catch((error) => {
        console.error('Profile photo upload failed:', error);
        setPhotoMessage(error.message || 'Could not save the photo.');
      })
      .finally(() => {
        e.target.value = '';
      });
  };

  const AuthContainer = ({ children, subtitle }) => (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-[#0b0502]">
      <div className="relative w-full max-w-md bg-orange-950/40 backdrop-blur-md p-8 border border-orange-500/50 shadow-[0_0_40px_rgba(249,115,22,0.2)] overflow-hidden">
        <div className="absolute top-0 left-0 w-16 h-1 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
        <div className="absolute top-0 left-0 w-1 h-16 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
        <div className="absolute bottom-0 right-0 w-16 h-1 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
        <div className="absolute bottom-0 right-0 w-1 h-16 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]"></div>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white tracking-[0.2em] uppercase mb-1">WIT <span className="text-orange-500">ENROLL</span></h1>
          <p className="text-orange-400 font-mono text-xs tracking-widest uppercase">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );

  const LoginView = () => {
    const [loginData, setLoginData] = useState({ accessId: '', password: '' });
    const [loginMessage, setLoginMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleInputChange = (e) => setLoginData({ ...loginData, [e.target.name]: e.target.value });

    // SECURE LOGIN HANDLER
    const handleLogin = async () => {
      setLoginMessage('Verifying credentials...');
      try {
        const { response, result } = await requestApi('/login.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        });
        if (!response.ok) throw new Error(result.message || 'Login request failed.');
        
        if (result.status === 'success') {
          // Store secure DB data into profile
          const userDBData = {
              name: result.userData.name.toUpperCase(),
              id: result.userData.id,
              course: result.userData.course.toUpperCase(),
              age: result.userData.age.toString(),
              location: result.userData.location.toUpperCase(),
              email: result.userData.email.toUpperCase()
          };
          setProfile(userDBData);
          setCart([]);
          setProfileImage(null);
          setPhotoMessage('');
          try {
            const { response: photoResponse, result: photoResult } = await requestApi('/profile-photo.php', { credentials: 'include' });
            if (!photoResponse.ok) throw new Error(photoResult.message || 'Photo lookup failed.');
            if (photoResult.dataUrl) {
              setProfileImage(photoResult.dataUrl);
            }
          } catch (photoError) {
            console.error('Profile photo lookup failed:', photoError);
          }
          
          setLoginMessage('Access Granted. Routing to Mainframe...');
          setTimeout(() => setCurrentView('dashboard'), 1500);
        } else {
          setLoginMessage(`ERROR: ${result.message}`);
        }
      } catch (error) {
        console.error('Login request failed:', error);
        setLoginMessage(`LOGIN FAILED: ${error.message || 'Could not reach the API. Check Apache and the browser console.'}`);
      }
    };

    if (!API_CONFIGURED) {
      return (
        <AuthContainer subtitle="WIT STUDENT LOG IN">
          <div role="status" className="border border-orange-500/60 bg-black/40 p-4 text-center font-mono text-xs leading-relaxed text-orange-200">
            Student login is unavailable because this static site is not connected to the secure PHP API and database. No credentials were submitted or stored.
          </div>
        </AuthContainer>
      );
    }

    return (
      <AuthContainer subtitle="WIT STUDENT LOG IN">
        <div className="space-y-5 font-mono">
          {loginMessage && (
            <div className={`p-2 text-center text-xs border ${loginMessage.includes('ERROR') || loginMessage.includes('OFFLINE') ? 'border-red-500 text-red-400 bg-red-900/40' : 'border-orange-500 text-orange-400 bg-orange-900/40'}`}>
              {loginMessage}
            </div>
          )}
          <div>
            <label className="block text-orange-400 text-xs mb-1 uppercase tracking-wider">Access ID</label>
            <input type="text" name="accessId" onChange={handleInputChange} placeholder="e.g. 2024-0192" className="w-full bg-black/60 border border-orange-500/40 rounded-none p-3 text-orange-50 focus:outline-none focus:border-orange-400 shadow-inner text-sm" />
          </div>
          <div>
            <label htmlFor="login-passcode" className="block text-orange-400 text-xs mb-1 uppercase tracking-wider">Passcode</label>
            <div className="relative">
              <input id="login-passcode" type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" onChange={handleInputChange} placeholder="••••••••" className="w-full bg-black/60 border border-orange-500/40 rounded-none p-3 pr-12 text-orange-50 focus:outline-none focus:border-orange-400 shadow-inner text-sm" />
              <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />
            </div>
          </div>
          <button onClick={handleLogin} className="w-full mt-4 bg-orange-950/60 border border-orange-400 text-orange-400 hover:bg-orange-500 hover:text-black py-3 uppercase tracking-[0.15em] font-bold transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]">
            Initialize Session
          </button>
          <button onClick={() => setCurrentView('register')} className="w-full text-xs text-orange-400 hover:text-orange-300 transition-colors tracking-widest mt-4">
            [ REQUEST REGISTER FORM ]
          </button>
        </div>
      </AuthContainer>
    );
  };

  const RegisterView = () => {
    const [formData, setFormData] = useState({ fullName: '', accessId: '', course: '', year: '', age: '', email: '', location: '', password: '' });
    const [serverMessage, setServerMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const hasUpper = /[A-Z]/.test(formData.password);
    const hasNumber = /[0-9]/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
    const isValidLength = formData.password.length >= 8;
    const strengthScore = [hasUpper, hasNumber, hasSpecial, isValidLength].filter(Boolean).length;
    
    const isPasswordValid = strengthScore === 4;

    const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleRegister = async () => {
      if (!isPasswordValid) return; 
      
      try {
        const { response, result } = await requestApi('/register.php', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!response.ok) throw new Error(result.message || 'Registration request failed.');
        if (result.status === 'success') {
          setServerMessage("CLEARANCE GRANTED.");
          setTimeout(() => setCurrentView('login'), 2000);
        } else {
          setServerMessage(`ERROR: ${result.message}`);
        }
      } catch (error) {
        console.error('Registration request failed:', error);
        setServerMessage(`REGISTRATION FAILED: ${error.message || 'Could not reach the API. Check Apache and the browser console.'}`);
      }
    };

    if (!API_CONFIGURED) {
      return (
        <AuthContainer subtitle="Student Registration">
          <div role="status" className="border border-orange-500/60 bg-black/40 p-4 text-center font-mono text-xs leading-relaxed text-orange-200">
            Student registration is unavailable because this static site is not connected to the secure PHP API and database. Your details were not submitted or stored.
          </div>
          <button onClick={() => setCurrentView('login')} className="mt-5 w-full text-xs text-orange-400 hover:text-orange-300 underline underline-offset-4">
            Return to WIT Log In
          </button>
        </AuthContainer>
      );
    }

    return (
      <AuthContainer subtitle="Student Registration">
        <div className="space-y-4 font-mono text-xs">
          {serverMessage && (
            <div className="p-2 text-center border border-orange-500 text-orange-400 bg-orange-900/40">{serverMessage}</div>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Full Name</label>
              <input type="text" name="fullName" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
            </div>
            
            <div>
              <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Access ID</label>
              <input type="text" name="accessId" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Course</label>
              <input type="text" name="course" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
            </div>

            <div className="col-span-2">
              <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Email Uplink</label>
              <input type="email" name="email" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
            </div>

            <div className="grid grid-cols-3 gap-2 col-span-2">
              <div className="col-span-1">
                <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Year</label>
                <input type="number" name="year" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
              </div>
              <div className="col-span-1">
                <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Age</label>
                <input type="number" name="age" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
              </div>
              <div className="col-span-1">
                <label className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Location</label>
                <input type="text" name="location" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 text-orange-50 focus:outline-none focus:border-orange-400" />
              </div>
            </div>
            
            <div className="col-span-2 mt-2">
              <label htmlFor="register-passcode" className="block text-orange-400 text-[10px] mb-1 uppercase tracking-wider">Secure Passcode</label>
              <div className="relative">
                <input id="register-passcode" type={showPassword ? 'text' : 'password'} name="password" autoComplete="new-password" onChange={handleInputChange} className="w-full bg-black/60 border border-orange-500/40 p-2 pr-12 text-orange-50 focus:outline-none focus:border-orange-400" />
                <PasswordVisibilityToggle visible={showPassword} onToggle={() => setShowPassword((visible) => !visible)} />
              </div>
              
              <div className="flex gap-1 mt-2 h-1">
                <div className={`w-1/4 ${strengthScore >= 1 ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]' : 'bg-gray-800'}`}></div>
                <div className={`w-1/4 ${strengthScore >= 2 ? 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.8)]' : 'bg-gray-800'}`}></div>
                <div className={`w-1/4 ${strengthScore >= 3 ? 'bg-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.8)]' : 'bg-gray-800'}`}></div>
                <div className={`w-1/4 ${strengthScore === 4 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-800'}`}></div>
              </div>
              
              <div className="grid grid-cols-2 gap-1 mt-2 text-[8px] uppercase tracking-widest">
                <span className={hasUpper ? 'text-emerald-400' : 'text-gray-600'}>[ {hasUpper ? '✓' : '✗'} ] UPPERCASE</span>
                <span className={hasNumber ? 'text-emerald-400' : 'text-gray-600'}>[ {hasNumber ? '✓' : '✗'} ] NUMERIC</span>
                <span className={hasSpecial ? 'text-emerald-400' : 'text-gray-600'}>[ {hasSpecial ? '✓' : '✗'} ] SPECIAL CHAR</span>
                <span className={isValidLength ? 'text-emerald-400' : 'text-gray-600'}>[ {isValidLength ? '✓' : '✗'} ] 8+ CHARS</span>
              </div>
            </div>
          </div>

          <button 
            onClick={handleRegister} 
            disabled={!isPasswordValid}
            className={`w-full mt-4 py-3 uppercase tracking-[0.15em] font-bold transition-all ${isPasswordValid ? 'bg-orange-500/20 border border-orange-400 text-orange-400 hover:bg-orange-400 hover:text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-black/50 border border-gray-700 text-gray-600 cursor-not-allowed'}`}
          >
            {isPasswordValid ? 'Submit Credentials' : 'Await Protocol Match'}
          </button>
          <p className="text-center text-[10px] text-gray-400 mt-2">
            <button onClick={() => setCurrentView('login')} className="text-orange-400 hover:text-orange-300 underline underline-offset-4 decoration-orange-500/30">Abort Registration</button>
          </p>
        </div>
      </AuthContainer>
    );
  };

  const DashboardView = () => (
    <div className="min-h-screen p-4 md:p-8 bg-[#0b0502] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] font-mono text-sm selection:bg-orange-500/30 relative text-white">
      
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#140803] border border-red-500 p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
             <h3 className="text-red-500 text-xl font-bold tracking-widest mb-4">SYSTEM ALERT</h3>
             <p className="text-gray-200 tracking-wide mb-8">Do you really want to log out?</p>
             <div className="flex gap-4">
                <button onClick={handleLogoutConfirm} className="flex-1 bg-red-500/20 border border-red-500 text-red-400 hover:bg-red-500 hover:text-black py-2 tracking-widest transition-all uppercase font-bold">
                  Confirm
                </button>
                <button onClick={() => setShowLogoutModal(false)} className="flex-1 bg-orange-500/20 border border-orange-500 text-orange-400 hover:bg-orange-500 hover:text-black py-2 tracking-widest transition-all uppercase font-bold">
                  Cancel
                </button>
             </div>
          </div>
        </div>
      )}

      {transmitStatus !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="text-center">
            {transmitStatus === 'transmitting' ? (
              <>
                <div className="w-24 h-24 border-2 border-dashed border-orange-500 rounded-full animate-[spin_3s_linear_infinite] mx-auto mb-6 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                  <div className="w-16 h-16 border border-orange-400 rounded-full animate-[spin_2s_linear_infinite_reverse]"></div>
                </div>
                <h2 className="text-orange-400 text-xl font-bold tracking-[0.3em] uppercase animate-pulse">Transmitting Payload...</h2>
              </>
            ) : transmitStatus === 'success' ? (
              <>
                <div className="w-24 h-24 bg-orange-500/20 border border-orange-400 rounded-full mx-auto mb-6 flex items-center justify-center shadow-[0_0_50px_rgba(249,115,22,0.8)]">
                  <span className="text-orange-400 text-4xl">✓</span>
                </div>
                <h2 className="text-orange-400 text-xl font-bold tracking-[0.3em] uppercase">Transmission Successful</h2>
                <p className="text-orange-300 mt-2 tracking-widest text-xs">Registrar has received your data.</p>
              </>
            ) : (
              <>
                <h2 className="text-red-400 text-xl font-bold tracking-[0.2em] uppercase">Enrollment Failed</h2>
                <p className="text-red-300 mt-3 max-w-lg text-xs">{transmitMessage}</p>
                <button onClick={() => setTransmitStatus('idle')} className="mt-6 border border-orange-400 px-5 py-2 text-orange-300 uppercase tracking-widest">Close</button>
              </>
            )}
          </div>
        </div>
      )}

      <header className="bg-orange-950/40 backdrop-blur-md p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.15)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]"></div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-widest uppercase">WESTERN INSTITUTE OF TECH <span className="text-orange-400">//</span> ENROLLMENT</h1>
          <p className="text-orange-300 mt-2 tracking-widest text-xs font-bold">MAINFRAME UPLINK ESTABLISHED</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="px-4 py-2 bg-orange-900/40 text-orange-300 border border-orange-500/40">
            SYS: <span className="font-bold text-orange-400 animate-pulse">ONLINE</span>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="text-red-400 hover:text-red-300 border border-red-500/40 px-4 py-2 bg-red-950/40 hover:bg-red-900/60 transition-colors uppercase tracking-widest font-bold">
            Log Out
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 bg-orange-950/30 backdrop-blur-md p-6 border border-orange-500/40 relative shadow-[0_0_20px_rgba(249,115,22,0.1)] h-fit">
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-orange-500"></div>
          
          <h2 className="text-xl font-bold mb-6 border-b border-orange-500/30 pb-2 text-orange-100 tracking-widest uppercase flex justify-between">
            <span>Available Data Modules</span>
            <span className="text-orange-400 text-xs mt-2 font-bold">SEC-03</span>
          </h2>
          
          <div className="mb-4 space-y-2">
            <input
              type="search"
              value={subjectSearch}
              onChange={(event) => setSubjectSearch(event.target.value)}
              placeholder="Search by code, subject, or schedule..."
              aria-label="Search available subjects"
              className="w-full bg-black/50 border border-orange-500/40 p-3 text-orange-100 text-xs focus:outline-none focus:border-orange-400"
            />
            {cartMessage && <p aria-live="polite" className="text-orange-300 text-[10px] tracking-wide">{cartMessage}</p>}
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredSubjects.length === 0 && <p className="py-8 text-center text-orange-300/70 text-xs">No subjects match that search.</p>}
            {filteredSubjects.map((subject) => {
              const isMounted = cart.some(item => item.code === subject.code);
              const exceedsLimit = !isMounted && totalUnits + subject.units > payloadLimit;
              
              return (
                <div key={subject.code} className="group flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-orange-900/20 hover:bg-orange-900/40 transition-all border border-orange-500/20 hover:border-orange-400 gap-4 relative overflow-hidden shadow-sm">
                  <div className={`absolute left-0 top-0 w-1.5 h-full transition-colors ${isMounted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-transparent group-hover:bg-orange-400'}`}></div>
                  <div>
                    <h3 className={`font-bold text-lg ${isMounted ? 'text-emerald-400' : 'text-orange-400'}`}>{subject.code}</h3>
                    <p className="text-orange-100 uppercase text-xs mt-1 font-bold">{subject.desc}</p>
                    <p className="text-orange-300 text-[10px] mt-2 tracking-widest font-bold">{subject.time} // {subject.units} UNITS</p>
                  </div>
                  <button 
                    onClick={() => addSubject(subject)}
                    disabled={isMounted || exceedsLimit}
                    className={`w-full md:w-auto px-6 py-2 border font-bold transition-all uppercase text-xs tracking-widest ${
                      isMounted 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 cursor-not-allowed' 
                        : exceedsLimit
                        ? 'bg-red-950/40 border-red-500/50 text-red-300/70 cursor-not-allowed'
                        : 'bg-orange-950/60 border-orange-400 hover:bg-orange-400 hover:text-black text-orange-400 shadow-[0_0_10px_rgba(249,115,22,0.3)]'
                    }`}
                  >
                    {isMounted ? 'Mounted' : exceedsLimit ? 'Over Limit' : 'Mount'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-8">
          
          <div className="bg-orange-950/30 backdrop-blur-md p-6 border border-orange-500/40 relative shadow-[0_0_20px_rgba(249,115,22,0.1)]">
             <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-orange-500"></div>
             <div className="flex justify-between items-center border-b border-orange-500/30 mb-4 pb-2">
                 <h2 className="text-sm font-bold text-orange-100 tracking-widest uppercase">Profile</h2>
                 <button 
                    onClick={() => setIsEditingProfile(!isEditingProfile)} 
                    className="text-[10px] bg-orange-900/50 text-orange-300 hover:bg-orange-400 hover:text-black px-2 py-1 border border-orange-500/60 font-bold transition-colors uppercase tracking-widest"
                 >
                    {isEditingProfile ? 'Save' : 'Edit'}
                 </button>
             </div>

             <div className="flex gap-4 items-start">
                <div className="relative w-16 h-16 border border-orange-500/60 flex items-center justify-center bg-orange-900/30 shrink-0 group overflow-hidden shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                    {profileImage ? (
                      <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-orange-400 text-2xl">👤</span>
                    )}

                    {isEditingProfile && (
                      <label className="absolute inset-0 bg-black/80 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] text-orange-300 text-center font-bold uppercase tracking-widest leading-tight">Change<br/>Image</span>
                        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
                      </label>
                    )}
                </div>

                <div className="text-[10px] tracking-widest leading-relaxed w-full">
                    {isEditingProfile ? (
                        <div className="space-y-2 font-bold">
                            <input name="name" value={profile.name} onChange={handleProfileChange} className="w-full bg-orange-950/80 border border-orange-500/50 p-1 text-orange-300 focus:border-orange-400 outline-none" placeholder="NAME" />
                            <input name="id" value={profile.id} onChange={handleProfileChange} className="w-full bg-orange-950/80 border border-orange-500/50 p-1 text-orange-300 focus:border-orange-400 outline-none" placeholder="ID" disabled />
                            <div className="flex gap-2">
                                <input name="course" value={profile.course} onChange={handleProfileChange} className="w-full bg-orange-950/80 border border-orange-500/50 p-1 text-orange-300 focus:border-orange-400 outline-none" placeholder="COURSE" />
                                <input name="age" value={profile.age} onChange={handleProfileChange} className="w-16 bg-orange-950/80 border border-orange-500/50 p-1 text-orange-300 focus:border-orange-400 outline-none" placeholder="AGE" />
                            </div>
                            <input name="email" value={profile.email} onChange={handleProfileChange} className="w-full bg-orange-950/80 border border-orange-500/50 p-1 text-orange-300 focus:border-orange-400 outline-none" placeholder="EMAIL" />
                            <input name="location" value={profile.location} onChange={handleProfileChange} className="w-full bg-orange-950/80 border border-orange-500/50 p-1 text-orange-300 focus:border-orange-400 outline-none" placeholder="LOCATION" />
                        </div>
                    ) : (
                        <>
                            <p className="text-orange-300 font-bold text-xs mb-1">{profile.name}</p>
                            <p className="text-orange-100">ID: {profile.id}</p>
                            <p className="text-orange-300">{profile.course} // AGE: {profile.age}</p>
                            <p className="text-orange-300 border-t border-orange-500/30 pt-1 mt-1 inline-block w-full">{profile.email}</p>
                            <p className="text-orange-400">LOC: {profile.location}</p>
                        </>
                    )}
                </div>
             </div>
             {photoMessage && <p aria-live="polite" className="mt-3 text-[10px] tracking-wide text-orange-300">{photoMessage}</p>}
          </div>

          <div className="bg-orange-950/30 backdrop-blur-md p-6 h-fit sticky top-8 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.1)]">
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-orange-500"></div>

            <h2 className="text-xl font-bold mb-6 border-b border-orange-500/30 pb-2 text-orange-100 tracking-widest uppercase">Active Array</h2>
            
            {cart.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-orange-300/60">
                <div className="w-16 h-16 border border-dashed border-orange-400/50 rounded-full animate-[spin_10s_linear_infinite] flex items-center justify-center mb-4">
                   <div className="w-8 h-8 border border-orange-400/50 rounded-full"></div>
                </div>
                <p className="tracking-widest text-xs font-bold">NO MODULES DETECTED</p>
              </div>
            ) : (
               <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.code} className="flex justify-between items-center p-3 bg-orange-900/20 border border-orange-500/30 border-l-4 border-l-orange-500 shadow-sm">
                    <span className="text-sm text-orange-100 font-bold">{item.code}</span>
                    <button onClick={() => removeSubject(item.code)} className="text-red-400 hover:text-white text-xs hover:bg-red-500 px-2 py-1 border border-red-500/40 transition-all font-bold">
                      [ DROP ]
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-orange-500/30">
              <div className="flex justify-between text-xs mb-3 tracking-widest font-bold">
                <span className="text-orange-300">PAYLOAD LIMIT:</span>
                <span className="text-orange-400">{totalUnits} / {payloadLimit}</span>
              </div>
              <div className="h-2 w-full overflow-hidden bg-black/60 border border-orange-500/30" role="progressbar" aria-label="Enrolled units" aria-valuemin="0" aria-valuemax={payloadLimit} aria-valuenow={Math.min(totalUnits, payloadLimit)}>
                <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${Math.min((totalUnits / payloadLimit) * 100, 100)}%` }}></div>
              </div>
              <p className="mt-2 text-[10px] text-orange-300/80">{Math.max(payloadLimit - totalUnits, 0)} units remaining</p>
              <div className="flex justify-between text-sm border-t border-orange-500/20 pt-3 mt-2 font-bold">
                <span className="text-orange-200 tracking-widest">PROJ. ALLOCATION:</span>
                <span className="text-orange-400 text-base">PHP {totalAssessment.toLocaleString()}.00</span>
              </div>
            </div>

            <button 
              onClick={handleTransmit}
              disabled={cart.length === 0}
              className={`w-full mt-8 py-4 font-bold tracking-[0.3em] uppercase transition-all text-xs border ${
                cart.length > 0 
                  ? 'bg-orange-500/20 border-orange-400 text-orange-300 hover:bg-orange-400 hover:text-black shadow-[0_0_20px_rgba(249,115,22,0.4)]' 
                  : 'bg-black/50 border-orange-900/50 text-orange-950 cursor-not-allowed'
              }`}
            >
              Transmit to Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (currentView === 'login') return <LoginView />;
  if (currentView === 'register') return <RegisterView />;
  if (currentView === 'dashboard') return <DashboardView />;
}

export default App;
