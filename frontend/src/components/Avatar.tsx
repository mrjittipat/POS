import { getAvatar } from '../utils/avatar';

interface AvatarProps {
  userId?: number;
  name?: string;
  className?: string; // กำหนดขนาด เช่น "w-9 h-9 text-sm"
}

export default function Avatar({ userId, name, className = 'w-9 h-9 text-sm' }: AvatarProps) {
  const avatar = getAvatar(userId);

  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || 'avatar'}
        className={`${className} rounded-full object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${className} bg-primary-600 rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {name?.charAt(0) || 'U'}
    </div>
  );
}