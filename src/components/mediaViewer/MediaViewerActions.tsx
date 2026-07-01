import type { FC } from '../../lib/teact/teact';
import { memo, useMemo } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { ApiChat } from '../../api/types';
import type { ActiveDownloads, MediaViewerOrigin, MessageListType } from '../../types';
import type { IconName } from '../../types/icons';
import type { MediaViewerItem, ViewableMedia } from './helpers/getViewableMedia';

import {
  selectActiveDownloads,
  selectAllowedMessageActionsSlow, selectCurrentChat,
  selectCurrentMessageList,
  selectIsChatProtected,
  selectIsMessageProtected,
  selectTabState,
} from '../../global/selectors';
import selectViewableMedia from './helpers/getViewableMedia';

import useAppLayout from '../../hooks/useAppLayout';
import useOldLang from '../../hooks/useOldLang';
import useMediaViewerActions from './hooks/useMediaViewerActions';

import DeleteProfilePhotoModal from '../common/DeleteProfilePhotoModal';
import Icon from '../common/icons/Icon';
import Button from '../ui/Button';
import DropdownMenu from '../ui/DropdownMenu';
import MenuItem from '../ui/MenuItem';
import ProgressSpinner from '../ui/ProgressSpinner';

import './MediaViewerActions.scss';

type OwnProps = {
  item?: MediaViewerItem;
  mediaData?: string;
  isVideo: boolean;
  canUpdateMedia?: boolean;
  canReportAvatar?: boolean;
  activeDownloads?: ActiveDownloads;
  onReportAvatar: NoneToVoidFunction;
  onBeforeDelete: NoneToVoidFunction;
  onCloseMediaViewer: NoneToVoidFunction;
  onForward: NoneToVoidFunction;
};

type StateProps = {
  activeDownloads: ActiveDownloads;
  isProtected?: boolean;
  isChatProtected?: boolean;
  canDelete?: boolean;
  chat?: ApiChat;
  canUpdate?: boolean;
  messageListType?: MessageListType;
  origin?: MediaViewerOrigin;
  viewableMedia?: ViewableMedia;
};

const MediaViewerActions: FC<OwnProps & StateProps> = ({
  item,
  mediaData,
  isVideo,
  chat,
  isChatProtected,
  isProtected,
  canReportAvatar,
  canDelete,
  canUpdate,
  messageListType,
  activeDownloads,
  origin,
  viewableMedia,
  onReportAvatar: onReport,
  onCloseMediaViewer,
  onBeforeDelete,
  onForward,
}) => {
  const { isMobile } = useAppLayout();
  const lang = useOldLang();

  const {
    mobileMenuItems,
    isDeleteModalOpen,
    closeDeleteModal,
    handleDownloadClick,
    handleZoomIn,
    handleZoomOut,
    handleUpdate,
    openDeleteModalHandler,
    isDownloading,
    downloadProgress,
    fileName,
  } = useMediaViewerActions({
    item,
    mediaData,
    isVideo,
    canReportAvatar,
    isChatProtected,
    isProtected,
    canDelete,
    canUpdate,
    chat,
    messageListType,
    activeDownloads,
    origin,
    viewableMedia,
    onReport,
    onBeforeDelete,
    onCloseMediaViewer,
    onForward,
  });

  const MenuButton: FC<{ onTrigger: () => void; isOpen?: boolean }> = useMemo(() => {
    return ({ onTrigger, isOpen }) => (
      <Button
        round
        size="smaller"
        color="translucent"
        className={isOpen ? 'active' : undefined}
        onClick={onTrigger}
        ariaLabel="More actions"
        iconName="more"
      />
    );
  }, []);

  function renderDeleteModal() {
    return (item?.type === 'avatar') ? (
      <DeleteProfilePhotoModal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={onBeforeDelete}
        profileId={item.avatarOwner.id}
        photo={item.profilePhotos.photos[item.mediaIndex]}
      />
    ) : undefined;
  }

  function renderDownloadButton() {
    if (isProtected || item?.type === 'standalone') {
      return undefined;
    }

    return item?.type !== 'sponsoredMessage' && (isVideo ? (
      <Button
        round
        size="smaller"
        color="translucent-white"
        ariaLabel={lang('AccActionDownload')}
        onClick={handleDownloadClick}
      >
        {isDownloading ? (
          <ProgressSpinner progress={downloadProgress} size="s" onClick={handleDownloadClick} />
        ) : (
          <Icon name="download" />
        )}
      </Button>
    ) : (
      <Button
        href={mediaData}
        download={fileName}
        round
        size="smaller"
        color="translucent-white"
        ariaLabel={lang('AccActionDownload')}
        iconName="download"
      />
    ));
  }

  if (isMobile) {
    if (mobileMenuItems.length === 0) {
      return undefined;
    }

    return (
      <div className="MediaViewerActions-mobile">
        <DropdownMenu
          trigger={MenuButton}
          positionX="right"
        >
          {mobileMenuItems.map(({
            icon, onClick, href, download, children, destructive,
          }) => (
            <MenuItem
              key={icon}
              icon={icon as IconName}
              href={href}
              download={download}
              onClick={onClick}
              destructive={destructive}
            >
              {children}
            </MenuItem>
          ))}
        </DropdownMenu>
        {isDownloading && <ProgressSpinner progress={downloadProgress} size="s" noCross />}
        {canDelete && renderDeleteModal()}
      </div>
    );
  }

  const isMessage = item?.type === 'message';

  return (
    <div className="MediaViewerActions">
      {isMessage && item.message.isForwardingAllowed && !isChatProtected && (
        <Button
          round
          size="smaller"
          color="translucent-white"
          ariaLabel={lang('Forward')}
          onClick={onForward}
          iconName="forward"
        />
      )}
      {renderDownloadButton()}
      <Button
        round
        size="smaller"
        color="translucent-white"
        ariaLabel={lang('MediaZoomOut')}
        onClick={handleZoomOut}
        iconName="zoom-out"
      />
      <Button
        round
        size="smaller"
        color="translucent-white"
        ariaLabel={lang('MediaZoomIn')}
        onClick={handleZoomIn}
        iconName="zoom-in"
      />
      {canReportAvatar && (
        <Button
          round
          size="smaller"
          color="translucent-white"
          ariaLabel={lang(isVideo ? 'PeerInfo.ReportProfileVideo' : 'PeerInfo.ReportProfilePhoto')}
          onClick={onReport}
          iconName="flag"
        />
      )}
      {canUpdate && (
        <Button
          round
          size="smaller"
          color="translucent-white"
          ariaLabel={lang('ProfilePhoto.SetMainPhoto')}
          onClick={handleUpdate}
          iconName="copy-media"
        />
      )}
      {canDelete && (
        <Button
          round
          size="smaller"
          color="translucent-white"
          ariaLabel={lang('Delete')}
          onClick={openDeleteModalHandler}
          iconName="delete"
        />
      )}
      <Button
        round
        size="smaller"
        color="translucent-white"
        ariaLabel={lang('Close')}
        onClick={onCloseMediaViewer}
        iconName="close"
      />
      {canDelete && renderDeleteModal()}
    </div>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, {
    item, canUpdateMedia,
  }): Complete<StateProps> => {
    const tabState = selectTabState(global);
    const { origin } = tabState.mediaViewer;

    const message = item?.type === 'message' ? item.message : undefined;
    const avatarOwner = item?.type === 'avatar' ? item.avatarOwner : undefined;
    const avatarPhoto = item?.type === 'avatar' && item.profilePhotos.photos[item.mediaIndex];

    const chat = selectCurrentChat(global);
    const currentMessageList = selectCurrentMessageList(global);
    const { threadId } = selectCurrentMessageList(global) || {};
    const isProtected = selectIsMessageProtected(global, message);
    const activeDownloads = selectActiveDownloads(global);
    const isChatProtected = message && selectIsChatProtected(global, message?.chatId);
    const { canDelete: canDeleteMessage } = (threadId
      && message && selectAllowedMessageActionsSlow(global, message, threadId)) || {};
    const isCurrentAvatar = avatarPhoto && (avatarPhoto.id === avatarOwner?.avatarPhotoId);
    const canDeleteAvatar = canUpdateMedia && Boolean(avatarPhoto);
    const canDelete = canDeleteMessage || canDeleteAvatar;
    const canUpdate = canUpdateMedia && Boolean(avatarPhoto) && !isCurrentAvatar;
    const messageListType = currentMessageList?.type;
    const viewableMedia = selectViewableMedia(global, origin, item);

    return {
      activeDownloads,
      isProtected,
      chat,
      isChatProtected,
      canDelete,
      canUpdate,
      messageListType,
      origin,
      viewableMedia,
    };
  },
)(MediaViewerActions));
