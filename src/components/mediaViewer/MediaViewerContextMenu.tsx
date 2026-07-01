import type { FC } from '../../lib/teact/teact';
import { memo, useRef } from '../../lib/teact/teact';
import { withGlobal } from '../../global';

import type { ApiChat } from '../../api/types';
import type { ActiveDownloads, IAnchorPosition, MediaViewerOrigin, MessageListType } from '../../types';
import type { IconName } from '../../types/icons';
import type { MediaViewerItem, ViewableMedia } from './helpers/getViewableMedia';

import {
  selectActiveDownloads,
  selectAllowedMessageActionsSlow,
  selectCurrentChat,
  selectCurrentMessageList,
  selectIsChatProtected,
  selectIsMessageProtected,
  selectTabState,
} from '../../global/selectors';
import selectViewableMedia from './helpers/getViewableMedia';

import useLastCallback from '../../hooks/useLastCallback';
import useMediaViewerActions from './hooks/useMediaViewerActions';

import DeleteProfilePhotoModal from '../common/DeleteProfilePhotoModal';
import Menu from '../ui/Menu';
import MenuItem from '../ui/MenuItem';
import MenuSeparator from '../ui/MenuSeparator';

type OwnProps = {
  item?: MediaViewerItem;
  mediaData?: string;
  isVideo: boolean;
  canUpdateMedia?: boolean;
  canReportAvatar?: boolean;
  isOpen: boolean;
  anchor: IAnchorPosition | undefined;
  onReportAvatar: NoneToVoidFunction;
  onBeforeDelete: NoneToVoidFunction;
  onCloseMediaViewer: NoneToVoidFunction;
  onForward: NoneToVoidFunction;
  onClose: NoneToVoidFunction;
  onCloseAnimationEnd?: NoneToVoidFunction;
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

const MediaViewerContextMenu: FC<OwnProps & StateProps> = ({
  item,
  mediaData,
  isVideo,
  isChatProtected,
  isProtected,
  canReportAvatar,
  canDelete,
  canUpdate,
  chat,
  messageListType,
  activeDownloads,
  origin,
  viewableMedia,
  isOpen,
  anchor,
  onReportAvatar: onReport,
  onBeforeDelete,
  onCloseMediaViewer,
  onForward,
  onClose,
  onCloseAnimationEnd,
}) => {
  const menuRef = useRef<HTMLDivElement>();

  const {
    contextMenuItems,
    isDeleteModalOpen,
    closeDeleteModal,
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

  const getMenuElement = useLastCallback(() => menuRef.current);
  const getRootElement = useLastCallback(() => document.body);
  const getTriggerElement = useLastCallback(() => document.getElementById('MediaViewer'));
  const getLayout = useLastCallback(() => ({ withPortal: true, isDense: true }));

  if (!anchor) return undefined;

  return (
    <>
      <Menu
        ref={menuRef}
        isOpen={isOpen}
        anchor={anchor}
        className="MediaViewerContextMenu"
        withPortal
        autoClose
        getTriggerElement={getTriggerElement}
        getMenuElement={getMenuElement}
        getRootElement={getRootElement}
        getLayout={getLayout}
        onClose={onClose}
        onCloseAnimationEnd={onCloseAnimationEnd}
      >
        {contextMenuItems.map((menuItem, idx) => {
          const prevItem = contextMenuItems[idx - 1];
          const needSeparator = menuItem.destructive && prevItem && !prevItem.destructive;
          return (
            <>
              {needSeparator && <MenuSeparator key={`sep-${idx}`} />}
              <MenuItem
                key={String(menuItem.icon)}
                icon={menuItem.icon as IconName}
                href={menuItem.href}
                download={menuItem.download}
                onClick={menuItem.onClick}
                destructive={menuItem.destructive}
              >
                {menuItem.children}
              </MenuItem>
            </>
          );
        })}
      </Menu>
      {canDelete && item?.type === 'avatar' && (
        <DeleteProfilePhotoModal
          isOpen={isDeleteModalOpen}
          onClose={closeDeleteModal}
          onConfirm={onBeforeDelete}
          profileId={item.avatarOwner.id}
          photo={item.profilePhotos.photos[item.mediaIndex]}
        />
      )}
    </>
  );
};

export default memo(withGlobal<OwnProps>(
  (global, { item, canUpdateMedia }): Complete<StateProps> => {
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
    const isChatProtected = message && selectIsChatProtected(global, message.chatId);
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
)(MediaViewerContextMenu));
