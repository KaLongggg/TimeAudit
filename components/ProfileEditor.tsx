
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { X, Camera, Save, User as UserIcon, Mail, Building, Phone, MapPin, Smartphone } from 'lucide-react';
import { COUNTRY_CODES } from '../constants';

interface ProfileEditorProps {
  user: User;
  onSave: (updatedUser: User) => Promise<void>;
  onClose: () => void;
}

const parsePhoneNumber = (phone: string | undefined) => {
  if (!phone) return { code: '+61', number: '' };
  const sortedCodes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  const match = sortedCodes.find(c => phone.startsWith(c.code));
  if (match) {
    return { code: match.code, number: phone.slice(match.code.length).trim() };
  }
  return { code: '+61', number: phone };
};

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ user, onSave, onClose }) => {
  const [name, setName] = useState(user.name);
  const [avatar, setAvatar] = useState(user.avatar);
  const [department, setDepartment] = useState(user.department || '');
  
  const initialWork = parsePhoneNumber(user.workPhone);
  const initialPersonal = parsePhoneNumber(user.personalPhone);
  
  const [workPhoneCode, setWorkPhoneCode] = useState(initialWork.code);
  const [workPhoneNumber, setWorkPhoneNumber] = useState(initialWork.number);
  
  const [personalPhoneCode, setPersonalPhoneCode] = useState(initialPersonal.code);
  const [personalPhoneNumber, setPersonalPhoneNumber] = useState(initialPersonal.number);

  const [street, setStreet] = useState(user.street || '');
  const [city, setCity] = useState(user.city || '');
  const [state, setState] = useState(user.state || '');
  const [zip, setZip] = useState(user.zip || '');
  const [country, setCountry] = useState(user.country || '');

  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const finalWorkPhone = workPhoneNumber ? `${workPhoneCode} ${workPhoneNumber}` : '';
    const finalPersonalPhone = personalPhoneNumber ? `${personalPhoneCode} ${personalPhoneNumber}` : '';

    try {
      await onSave({ 
        ...user, 
        name, 
        avatar,
        department,
        workPhone: finalWorkPhone,
        personalPhone: finalPersonalPhone,
        street,
        city,
        state,
        zip,
        country
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
          <h3 className="font-bold text-gray-800">Edit Profile</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="overflow-y-auto flex-1 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <img 
                  src={avatar || 'https://ui-avatars.com/api/?background=random'} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:opacity-75 transition-opacity bg-gray-100"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
                <input 
                  ref={fileInputRef}
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-xs text-gray-500 font-medium">Click photo to update</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Basic Info */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="email" 
                    value={user.email}
                    disabled
                    className="w-full pl-9 p-2 text-sm border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              
              {/* Additional Info */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="e.g. Engineering"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  />
                </div>
              </div>

              {/* Work Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Work Phone</label>
                <div className="flex gap-2">
                    <div className="relative w-1/3">
                        <select 
                            value={workPhoneCode}
                            onChange={(e) => setWorkPhoneCode(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-gray-900"
                        >
                            {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    <div className="relative flex-1">
                      <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="tel" 
                        placeholder="Number"
                        value={workPhoneNumber}
                        onChange={(e) => setWorkPhoneNumber(e.target.value)}
                        className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      />
                    </div>
                </div>
              </div>

              {/* Personal Phone */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Mobile Phone</label>
                <div className="flex gap-2">
                    <div className="relative w-1/3">
                        <select 
                            value={personalPhoneCode}
                            onChange={(e) => setPersonalPhoneCode(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none bg-white text-gray-900"
                        >
                            {COUNTRY_CODES.map(c => (
                                <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                      <input 
                        type="tel" 
                        placeholder="Number"
                        value={personalPhoneNumber}
                        onChange={(e) => setPersonalPhoneNumber(e.target.value)}
                        className="w-full pl-9 p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                      />
                    </div>
                </div>
              </div>

              {/* Manual Address Fields */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Home Address
                </label>
                <div className="space-y-3">
                    <div>
                        <input
                            type="text"
                            placeholder="Street Address"
                            value={street}
                            onChange={(e) => setStreet(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input
                            type="text"
                            placeholder="City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                        />
                        <input
                            type="text"
                            placeholder="State / Province"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                         <input
                            type="text"
                            placeholder="Zip / Postal Code"
                            value={zip}
                            onChange={(e) => setZip(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                        />
                        <input
                            type="text"
                            placeholder="Country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                        />
                    </div>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
