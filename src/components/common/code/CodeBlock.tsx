import type { FC } from '../../../lib/teact/teact';
import { memo } from '../../../lib/teact/teact';

import { ApiMessageEntityTypes } from '../../../api/types';

import { getPrettyCodeLanguageName } from '../../../util/prettyCodeLanguageNames';

import useAsync from '../../../hooks/useAsync';

import PeerColorWrapper from '../PeerColorWrapper';
import CodeOverlay from './CodeOverlay';

import './CodeBlock.scss';

export type OwnProps = {
  text: string;
  language?: string;
  noCopy?: boolean;
};

const CodeBlock: FC<OwnProps> = ({ text, language, noCopy }) => {
  const { result: highlighted } = useAsync(() => {
    if (!language) return Promise.resolve(undefined);
    return import('../../../util/highlightCode')
      .then((lib) => lib.default(text, language));
  }, [language, text]);

  return (
    <PeerColorWrapper
      className="CodeBlock"
    >
      {language && (<p className="code-title">{getPrettyCodeLanguageName(language)}</p>)}
      <pre className="code-block" data-entity-type={ApiMessageEntityTypes.Pre} data-language={language}>
        {highlighted ?? text}
        <CodeOverlay
          text={text}
          className="code-overlay"
          noCopy={noCopy}
        />
      </pre>
    </PeerColorWrapper>
  );
};

export default memo(CodeBlock);
