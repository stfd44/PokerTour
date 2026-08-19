import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

export function PageTransition() {
  const location = useLocation();
  const isFirstRender = useRef(true);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setPulse((value) => value + 1);
  }, [location.pathname]);

  if (pulse === 0) {
    return null;
  }

  return <div key={pulse} className="page-gold-wash" aria-hidden="true" />;
}
