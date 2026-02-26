import { useState } from 'react';
import type { MemeData } from '@/constants/memes';

interface Props {
  meme: MemeData;
  senderMember: {
    name: string;
    color: string;
    id: string;
  };
  showSenderName: boolean;
}

export default function MemeCard({ meme, senderMember, showSenderName }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="flex items-end gap-2 mb-1 animate-bubble-in-left">
      {/* Avatar */}
      <div className="w-9 h-9 shrink-0 self-start mt-1">
        {showSenderName && (
          <div
            className="w-9 h-9 rounded-full overflow-hidden"
            style={{ background: senderMember.color }}
          >
            <img
              src={`/idols/${senderMember.id}/profile.jpg`}
              alt={senderMember.name}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}
      </div>

      <div className="max-w-[65%]">
        {showSenderName && (
          <p className="text-[11px] font-semibold mb-1 ml-1" style={{ color: senderMember.color }}>
            {senderMember.name}
          </p>
        )}

        {/* 캡션 텍스트 (말풍선) */}
        {meme.caption && (
          <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm mb-1.5">
            <p className="text-sm text-gray-800 leading-relaxed">{meme.caption}</p>
          </div>
        )}

        {/* 이미지 */}
        <div
          className="rounded-2xl overflow-hidden shadow-sm bg-gray-100"
          style={{ maxWidth: '240px', minWidth: '120px' }}
        >
          {!imgFailed ? (
            <>
              {!imgLoaded && (
                <div className="w-full aspect-video bg-gray-100 flex items-center justify-center">
                  <div className="text-3xl animate-pulse">🖼️</div>
                </div>
              )}
              <img
                src={`/memes/${meme.filename}`}
                alt={meme.description}
                className={`w-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                style={{ maxHeight: '240px', imageRendering: 'auto' }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgFailed(true)}
              />
            </>
          ) : (
            // fallback: 멤버 프로필 사진 + 캡션 오버레이
            <div className="relative overflow-hidden" style={{ minWidth: '160px', aspectRatio: '4/3' }}>
              <img
                src={`/idols/${meme.member}/profile.jpg`}
                alt={meme.description}
                className="w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div
                className="absolute bottom-0 left-0 right-0 px-2.5 py-1.5"
                style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.55))' }}
              >
                <p className="text-[11px] font-semibold text-white leading-tight">{meme.description}</p>
                <p className="text-[9px] text-white/70">TWIN PLANET</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
