import type { CSSProperties } from 'react';
import { avatarColor, avatarLetter } from './helpers';

type AvatarStyle = CSSProperties & { '--av': string };

type AvatarProps = {
  name: string;
  size?: number;
  color?: string | undefined;
};

export const Avatar = ({ name, size = 24, color }: AvatarProps) => {
  const style: AvatarStyle = {
    width: size,
    height: size,
    fontSize: size * 0.45,
    '--av': color ?? avatarColor(name),
  };

  return (
    <span className="avatar" style={style} aria-hidden="true">
      {avatarLetter(name)}
    </span>
  );
};
