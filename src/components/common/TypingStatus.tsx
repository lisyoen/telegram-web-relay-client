import type { FC } from '../../lib/teact/teact';
import { memo } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { ApiTypingStatus, ApiUser } from '../../api/types';

import { getUserFirstOrLastName } from '../../global/helpers';
import { selectUser } from '../../global/selectors';
import renderText from './helpers/renderText';

import useOldLang from '../../hooks/useOldLang';

import DotAnimation from './DotAnimation';

import './TypingStatus.scss';

type OwnProps = {
  typingStatus: ApiTypingStatus;
};

type StateProps = {
  typingUser?: ApiUser;
};

const TypingStatus: FC<OwnProps & StateProps> = ({ typingStatus, typingUser }) => {
  const lang = useOldLang();
  const typingUserName = typingUser && !typingUser.isSelf && getUserFirstOrLastName(typingUser);
  const emoji = typingStatus.emoji || '';
  const rawAction = lang(typingStatus.action);
  // v0.52: ko 팩 "{user}님이 입력 중" 처럼 action 문자열에 {user} 토큰이 박혀 있으면
  // 이름을 인라인으로 치환하고 별도 sender-name span 은 생략(중복 방지).
  // 토큰이 없는 로케일(en 등)은 기존 sender-name span + content 분리 렌더 유지.
  const hasUserToken = rawAction.includes('{user}');
  const content = rawAction
    .replace('{user}', hasUserToken ? (typingUserName || '') : '')
    .replace('{emoji}', emoji).trim();
  const showNameSpan = !hasUserToken && Boolean(typingUserName);

  return (
    <p className="typing-status" dir={lang.isRtl ? 'rtl' : 'auto'}>
      {showNameSpan && (
        <span className="sender-name" dir="auto">{renderText(typingUserName as string)}</span>
      )}
      <DotAnimation content={content} />
    </p>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { typingStatus }): Complete<StateProps> => {
    if (!typingStatus.userId) {
      return { typingUser: undefined };
    }

    const typingUser = selectUser(global, typingStatus.userId);

    return { typingUser };
  },
)(TypingStatus));
