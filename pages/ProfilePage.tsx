
import React, { useState } from 'react';
import { Employee } from '../types';
import { joinCompany, getCompanyDetails, uploadProfilePicture, updateEmployeeDetails } from '../services/apiService';
import { useNotification } from '../contexts/NotificationContext';

interface ProfilePageProps {
    user: Employee;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const { addNotification } = useNotification();

  // Helper to fetch company name if user is already in one
  React.useEffect(() => {
      const loadCompany = async () => {
          if (user.companyId && user.companyId !== 'mock_company_id') {
              try {
                  const company = await getCompanyDetails(user.companyId);
                  if (company) setCompanyName(company.name);
              } catch (e) {
                  console.error(e);
              }
          }
      };
      loadCompany();
  }, [user.companyId]);

  const handleJoinCompany = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!inviteCode.trim()) return;

      if (!window.confirm("¿Estás seguro? Unirte a una nueva empresa te desconectará de la actual y restablecerá tu horario.")) {
          return;
      }

      setIsJoining(true);
      try {
          await joinCompany(inviteCode);
          addNotification('Te has unido a la empresa exitosamente.', 'success');
          setInviteCode('');
          // Force a reload to refresh context completely or let the stream update naturally
          setTimeout(() => window.location.reload(), 1000); 
      } catch (error: any) {
          console.error(error);
          addNotification(error.message || 'Error al unirse a la empresa.', 'error');
      } finally {
          setIsJoining(false);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          // Basic validation
          if (file.size > 5 * 1024 * 1024) { // 5MB limit
              addNotification("La imagen es demasiado grande. Máximo 5MB.", 'error');
              return;
          }

          setIsUploading(true);
          try {
              const downloadUrl = await uploadProfilePicture(user.id, file);
              
              // In mock mode, we manually update the local object if needed, 
              // but for real implementation uploadProfilePicture updates the DB.
              // For consistency, let's trigger an update locally for immediate feedback if using mock
              if (user.companyId === 'mock_company_id') {
                  await updateEmployeeDetails({ ...user, avatarUrl: downloadUrl });
                  addNotification('Foto de perfil actualizada (Modo Demo).', 'success');
                  // In mock mode, force reload to see changes since we don't have real-time listeners on mock data array
                  setTimeout(() => window.location.reload(), 500); 
              } else {
                  addNotification('Foto de perfil actualizada exitosamente.', 'success');
              }
              
          } catch (error: any) {
              console.error("Upload failed", error);
              addNotification('Error al subir la imagen. Inténtalo de nuevo.', 'error');
          } finally {
              setIsUploading(false);
          }
      }
  };

  const getInitials = (name: string) => {
    const names = name.trim().split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const currentCompanyName = companyName || (user.companyId === 'mock_company_id' ? 'Demo Company' : 'Sin Asignar');

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in space-y-6 pb-12">
      <h1 className="text-3xl font-bold text-bokara-grey mb-2 px-1">Mi Perfil</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Personal Identity */}
          <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 flex flex-col items-center text-center h-full">
                  <div className="relative mb-4 group cursor-pointer">
                      <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 border-lucius-lime/20 text-4xl font-bold text-bokara-grey shadow-inner overflow-hidden bg-lucius-lime/10">
                          {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                              getInitials(user.name)
                          )}
                      </div>
                      
                      {/* Upload Overlay */}
                      <label htmlFor="profile-upload" className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {isUploading ? (
                              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                          )}
                          <input 
                              id="profile-upload" 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={handleImageUpload}
                              disabled={isUploading}
                          />
                      </label>

                      <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-white ${user.status === 'Working' ? 'bg-lucius-lime' : 'bg-gray-300'}`} title={user.status}></div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-bokara-grey">{user.name}</h2>
                  <span className={`mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${user.role === 'admin' ? 'bg-bokara-grey text-white' : 'bg-gray-100 text-bokara-grey'}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
                  </span>

                  <div className="w-full border-t border-bokara-grey/10 my-6"></div>

                  <div className="w-full space-y-4">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-whisper-white/30 border border-bokara-grey/5">
                          <div className="p-2 bg-white rounded-full text-lucius-lime shadow-sm">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <div className="text-left overflow-hidden">
                              <p className="text-xs text-bokara-grey/50 font-bold uppercase">Correo</p>
                              <p className="text-sm text-bokara-grey truncate font-medium" title={user.email}>{user.email}</p>
                          </div>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-whisper-white/30 border border-bokara-grey/5">
                          <div className="p-2 bg-white rounded-full text-lucius-lime shadow-sm">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                          </div>
                          <div className="text-left">
                              <p className="text-xs text-bokara-grey/50 font-bold uppercase">Teléfono</p>
                              <p className="text-sm text-bokara-grey font-medium">{user.phone || 'No registrado'}</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          {/* Right Column: Organization Info */}
          <div className="lg:col-span-2 space-y-6">
              
              {/* Organization Card */}
              <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-lucius-lime/10 rounded-lg text-lucius-lime">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                      </div>
                      <h2 className="text-xl font-bold text-bokara-grey">Información de Organización</h2>
                  </div>

                  <div className="bg-gradient-to-br from-whisper-white/50 to-white rounded-2xl p-6 border border-bokara-grey/10 flex flex-col sm:flex-row gap-6 sm:items-center">
                      <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl shadow-sm border border-bokara-grey/5 shrink-0">
                          🏢
                      </div>
                      <div className="flex-grow">
                          <p className="text-xs text-lucius-lime font-bold uppercase tracking-wider mb-1">Empresa Actual</p>
                          <h3 className="text-2xl font-bold text-bokara-grey">{currentCompanyName}</h3>
                          {user.companyId && user.companyId !== 'mock_company_id' && (
                              <p className="text-xs text-bokara-grey/40 font-mono mt-1 select-all">ID: {user.companyId}</p>
                          )}
                      </div>
                      <div className="sm:text-right border-t sm:border-t-0 sm:border-l border-bokara-grey/10 pt-4 sm:pt-0 sm:pl-6">
                          <p className="text-xs text-bokara-grey/50 font-bold uppercase tracking-wider mb-1">Ubicación</p>
                          <div className="flex items-center gap-2 sm:justify-end">
                              <svg className="w-4 h-4 text-bokara-grey/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              <span className="font-medium text-bokara-grey">{user.location || 'Oficina Principal'}</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Join New Company Section */}
              <div className="bg-white rounded-xl shadow-md border border-bokara-grey/10 p-6 sm:p-8">
                  <div className="flex items-start gap-4">
                      <div className="flex-grow">
                          <h3 className="text-lg font-bold text-bokara-grey mb-2">Zona de Vinculación</h3>
                          <p className="text-sm text-bokara-grey/70 mb-6">
                              Si necesitas cambiarte a otro equipo, ingresa el código de invitación proporcionado por tu administrador.
                              <br/>
                              <span className="text-red-500 font-medium text-xs bg-red-50 px-2 py-1 rounded mt-2 inline-block">
                                  ⚠️ Nota: Al unirte a una nueva organización, perderás acceso al historial de tu empresa actual.
                              </span>
                          </p>
                          
                          <form onSubmit={handleJoinCompany} className="flex flex-col sm:flex-row gap-3">
                              <div className="relative flex-grow">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                      <svg className="h-5 w-5 text-bokara-grey/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                                  </div>
                                  <input 
                                      type="text" 
                                      placeholder="Pegar código de invitación..." 
                                      className="w-full bg-whisper-white border border-bokara-grey/20 text-bokara-grey rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-lucius-lime transition-all"
                                      value={inviteCode}
                                      onChange={(e) => setInviteCode(e.target.value)}
                                  />
                              </div>
                              <button 
                                  type="submit" 
                                  disabled={!inviteCode.trim() || isJoining}
                                  className="bg-bokara-grey hover:bg-bokara-grey/90 text-white font-bold py-3 px-6 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-wait whitespace-nowrap"
                              >
                                  {isJoining ? 'Procesando...' : 'Unirse al Equipo'}
                              </button>
                          </form>
                      </div>
                  </div>
              </div>

          </div>
      </div>
    </div>
  );
};

export default ProfilePage;
