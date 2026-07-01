import type { FC } from '../../../lib/teact/teact';
import { memo, useCallback } from '../../../lib/teact/teact';
import { getActions } from '../../../global';

import buildClassName from '../../../util/buildClassName';
import { copyTextToClipboard } from '../../../util/clipboard';

import useOldLang from '../../../hooks/useOldLang';

import Icon from '../icons/Icon';

import styles from './CodeOverlay.module.scss';

export type OwnProps = {
  className?: string;
  text: string;
  noCopy?: boolean;
};

const CodeOverlay: FC<OwnProps> = ({
  text, className, noCopy,
}) => {
  const { showNotification } = getActions();
  const lang = useOldLang();

  const handleCopy = useCallback(() => {
    copyTextToClipboard(text);
    showNotification({
      message: lang('TextCopied'),
    });
  }, [lang, showNotification, text]);

  const contentClass = buildClassName(styles.content, noCopy && styles.hidden);
  const overlayClass = buildClassName(styles.overlay, className);

  return (
    <div className={overlayClass}>
      <div className={contentClass}>
        {!noCopy && (
          <div className={styles.copy} onClick={handleCopy} title={lang('Copy')}>
            <Icon name="copy" />
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(CodeOverlay);
