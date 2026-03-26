import { useEffect, useRef, useCallback } from 'react';
import { buildApiUrl } from '@/services/config';

export function useGlobalCleanUp() {
  const hasCleanedUp = useRef(false);
  // Naya flag: By default cleanup on rahega
  const shouldCleanup = useRef(true); 

  // Yeh function hum component ko denge taaki wo navigation se pehle cleanup rok sake
  const skipCleanup = useCallback(() => {
    shouldCleanup.current = false;
  }, []);

  useEffect(() => {
    const executeCleanup = () => {
      // Agar cleanup already ho chuka hai, YA humne isko skip karne ko bola hai -> toh ruk jao
      if (hasCleanedUp.current || !shouldCleanup.current) return; 

      const token = localStorage.getItem('token');
      if (!token) return;

      // 1. Leave Queue API
      fetch(buildApiUrl('/api/match/leave'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        keepalive: true 
      }).catch(() => {});

      // 2. End Session API
      fetch(buildApiUrl('/api/match/end'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}),
        keepalive: true
      }).catch(() => {});
      
      hasCleanedUp.current = true;
    };

    window.addEventListener('beforeunload', executeCleanup);

    return () => {
      window.removeEventListener('beforeunload', executeCleanup);
      executeCleanup();
    };
  }, []);

  // Hook ab ek function return karega
  return { skipCleanup };
}
