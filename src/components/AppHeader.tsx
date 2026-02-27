import { useNavigate } from 'react-router';

interface AppHeaderProps {
  subtitle?: string;
}

export function AppHeader({ subtitle }: AppHeaderProps) {
  const navigate = useNavigate();
  return (
    <div className="text-left mb-5">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex items-center justify-start gap-2 mb-3 animate-fade-in cursor-pointer hover:opacity-80 transition-opacity"
      >
        <img src="/tp-logo.svg?v=3" alt="tp" style={{ width: '28px', height: '30px' }} />
        <h1 className="text-[22px] font-black tracking-tight shimmer-text" style={{ color: '#1a1a1a' }}>
          twinplanet.chat
        </h1>
        <span className="ml-1.5 px-2 py-0.5 text-[9px] beta-badge rounded-full" style={{ background: '#dcff00', color: '#1a1a1a' }}>
          Beta
        </span>
      </button>
      {subtitle && (
        <p className="text-xs font-medium tracking-tight" style={{ color: '#3e3a39' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
