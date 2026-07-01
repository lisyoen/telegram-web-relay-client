import { useMemo } from '../../../lib/teact/teact';
import { getActions } from '../../../global';

import type { ApiChat } from '../../../api/types';
import type { ActiveDownloads, MediaViewerOrigin, MessageListType } from '../../../types';
import type { IconName } from '../../../types/icons';
import type { MenuItemProps } from '../../ui/MenuItem';
import type { MediaViewerItem, ViewableMedia } from '../helpers/getViewableMedia';

import {
  getIsDownloading,
  getMediaFilename,
  getMediaFormat,
  getMediaHash,
} from '../../../global/helpers';
import { copyImageToClipboard } from '../../../util/clipboard';
import { isUserId } from '../../../util/entities/ids';

import useFlag from '../../../hooks/useFlag';
import useLastCallback from '../../../hooks/useLastCallback';
import useMediaWithLoadProgress from '../../../hooks/useMediaWithLoadProgress';
import useOldLang from '../../../hooks/useOldLang';
import useZoomChange from './useZoomChangeSignal';

export type MediaViewerActionsProps = {
  item?: MediaViewerItem;
  mediaData?: string;
  isVideo: boolean;
  canReportAvatar?: boolean;
  isChatProtected?: boolean;
  isProtected?: boolean;
  canDelete?: boolean;
  canUpdate?: boolean;
  chat?: ApiChat;
  messageListType?: MessageListType;
  activeDownloads: ActiveDownloads;
  origin?: MediaViewerOrigin;
  viewableMedia?: ViewableMedia;
  onReport: NoneToVoidFunction;
  onBeforeDelete: NoneToVoidFunction;
  onCloseMediaViewer: NoneToVoidFunction;
  onForward: NoneToVoidFunction;
};

export default function useMediaViewerActions(props: MediaViewerActionsProps) {
  const {
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
    onReport,
    onBeforeDelete,
    onCloseMediaViewer,
    onForward,
  } = props;

  const [isDeleteModalOpen, openDeleteModal, closeDeleteModal] = useFlag(false);
  const [getZoomChange, setZoomChange] = useZoomChange();

  const {
    downloadMedia,
    cancelMediaDownload,
    updateProfilePhoto,
    updateChatPhoto,
    openMediaViewer,
    openDeleteMessageModal,
    showNotification,
  } = getActions();

  const isMessage = item?.type === 'message';

  const { media } = viewableMedia || {};
  const fileName = media ? getMediaFilename(media) : undefined;
  const isDownloading = media ? getIsDownloading(activeDownloads, media) : false;

  const { loadProgress: downloadProgress } = useMediaWithLoadProgress(
    media ? getMediaHash(media, 'download') : undefined,
    !isDownloading,
    media ? getMediaFormat(media, 'download') : undefined,
  );

  const handleDownloadClick = useLastCallback(() => {
    if (!media) return;
    if (isDownloading) {
      cancelMediaDownload({ media });
    } else {
      const message = item?.type === 'message' ? item.message : undefined;
      downloadMedia({ media, originMessage: message });
    }
  });

  const handleZoomOut = useLastCallback(() => {
    const zoomChange = getZoomChange();
    const change = zoomChange < 0 ? zoomChange : 0;
    setZoomChange(change - 1);
  });

  const handleZoomIn = useLastCallback(() => {
    const zoomChange = getZoomChange();
    const change = zoomChange > 0 ? zoomChange : 0;
    setZoomChange(change + 1);
  });

  const handleUpdate = useLastCallback(() => {
    if (item?.type !== 'avatar') return;
    const { avatarOwner, profilePhotos, mediaIndex } = item;
    const avatarPhoto = profilePhotos?.photos[mediaIndex];
    if (isUserId(avatarOwner.id)) {
      updateProfilePhoto({ photo: avatarPhoto });
    } else {
      updateChatPhoto({ chatId: avatarOwner.id, photo: avatarPhoto });
    }
    openMediaViewer({
      origin: origin!,
      chatId: avatarOwner.id,
      mediaIndex: 0,
      isAvatarView: true,
    }, {
      forceOnHeavyAnimation: true,
    });
  });

  const openDeleteModalHandler = useLastCallback(() => {
    if (item?.type === 'message' && chat) {
      openDeleteMessageModal({
        chatId: chat.id,
        messageIds: [item.message.id],
        isSchedule: messageListType === 'scheduled',
        onConfirm: onBeforeDelete,
      });
    } else {
      openDeleteModal();
    }
  });

  const lang = useOldLang();
  const canCopyImage = Boolean(mediaData && !isVideo && !isProtected);

  const handleCopyImage = useLastCallback(() => {
    if (!mediaData || isVideo) return;

    copyImageToClipboard(mediaData);
    showNotification({
      message: lang('lng_media_image_copied_to_clipboard'),
    });
  });

  const contextMenuItems = useMemo((): MenuItemProps[] => {
    const items: MenuItemProps[] = [];

    if (isMessage && item.message.isForwardingAllowed && !item.message.content.action && !isChatProtected) {
      items.push({
        icon: 'forward' as IconName,
        onClick: onForward,
        children: lang('Forward'),
      });
    }

    if (!isProtected && item?.type !== 'standalone' && item?.type !== 'sponsoredMessage') {
      if (isVideo) {
        items.push({
          icon: (isDownloading ? 'close' : 'download') as IconName,
          onClick: handleDownloadClick,
          children: isDownloading
            ? `${Math.round(downloadProgress * 100)}% Downloading...`
            : lang('AccActionDownload'),
        });
      } else {
        items.push({
          icon: 'download' as IconName,
          href: mediaData,
          download: fileName,
          children: lang('AccActionDownload'),
        });
      }
    }

    if (canCopyImage) {
      items.push({
        icon: 'copy' as IconName,
        onClick: handleCopyImage,
        children: lang('lng_context_copy_image'),
      });
    }

    items.push({
      icon: 'zoom-in' as IconName,
      onClick: handleZoomIn,
      children: lang('MediaZoomIn'),
    });

    items.push({
      icon: 'zoom-out' as IconName,
      onClick: handleZoomOut,
      children: lang('MediaZoomOut'),
    });

    if (canReportAvatar) {
      items.push({
        icon: 'flag' as IconName,
        onClick: onReport,
        children: lang('ReportPeer.Report'),
      });
    }

    if (canUpdate) {
      items.push({
        icon: 'copy-media' as IconName,
        onClick: handleUpdate,
        children: lang('ProfilePhoto.SetMainPhoto'),
      });
    }

    if (canDelete) {
      items.push({
        icon: 'delete' as IconName,
        onClick: openDeleteModalHandler,
        children: lang('Delete'),
        destructive: true,
      });
    }

    items.push({
      icon: 'close' as IconName,
      onClick: onCloseMediaViewer,
      children: lang('Close'),
    });

    return items;
  }, [
    isMessage, item, isChatProtected, isProtected, isVideo, isDownloading, downloadProgress,
    mediaData, fileName, canCopyImage, canReportAvatar, canUpdate, canDelete,
    lang, onForward, handleDownloadClick, handleCopyImage, handleZoomIn, handleZoomOut,
    onReport, handleUpdate, openDeleteModalHandler, onCloseMediaViewer,
  ]);

  const mobileMenuItems = useMemo((): MenuItemProps[] => {
    const items: MenuItemProps[] = [];

    if (isMessage && item.message.isForwardingAllowed && !item.message.content.action && !isChatProtected) {
      items.push({
        icon: 'forward' as IconName,
        onClick: onForward,
        children: lang('Forward'),
      });
    }

    if (!isProtected) {
      if (isVideo) {
        items.push({
          icon: (isDownloading ? 'close' : 'download') as IconName,
          onClick: handleDownloadClick,
          children: isDownloading
            ? `${Math.round(downloadProgress * 100)}% Downloading...`
            : 'Download',
        });
      } else {
        items.push({
          icon: 'download' as IconName,
          href: mediaData,
          download: fileName,
          children: lang('AccActionDownload'),
        });
      }
    }

    if (canCopyImage) {
      items.push({
        icon: 'copy' as IconName,
        onClick: handleCopyImage,
        children: lang('lng_context_copy_image'),
      });
    }

    if (canReportAvatar) {
      items.push({
        icon: 'flag' as IconName,
        onClick: onReport,
        children: lang('ReportPeer.Report'),
      });
    }

    if (canUpdate) {
      items.push({
        icon: 'copy-media' as IconName,
        onClick: handleUpdate,
        children: lang('ProfilePhoto.SetMainPhoto'),
      });
    }

    if (canDelete) {
      items.push({
        icon: 'delete' as IconName,
        onClick: openDeleteModalHandler,
        children: lang('Delete'),
        destructive: true,
      });
    }

    return items;
  }, [
    isMessage, item, isChatProtected, isProtected, isVideo, isDownloading, downloadProgress,
    mediaData, fileName, canCopyImage, canReportAvatar, canUpdate, canDelete,
    lang, onForward, handleDownloadClick, handleCopyImage, onReport, handleUpdate, openDeleteModalHandler,
  ]);

  return {
    contextMenuItems,
    mobileMenuItems,
    isDeleteModalOpen,
    openDeleteModal,
    closeDeleteModal,
    handleDownloadClick,
    handleZoomIn,
    handleZoomOut,
    handleUpdate,
    openDeleteModalHandler,
    isDownloading,
    downloadProgress,
    fileName,
  };
}
