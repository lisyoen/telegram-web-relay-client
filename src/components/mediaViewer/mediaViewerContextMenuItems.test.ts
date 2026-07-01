/**
 * MediaViewer 우클릭 컨텍스트 메뉴 항목 조립 로직 단위 테스트
 *
 * useMediaViewerActions 훅 내의 contextMenuItems 조립 로직과 동일한
 * 조건(item 타입, isProtected, isForwardingAllowed, canDelete, canUpdate,
 * canReportAvatar)에 따라 올바른 항목이 포함/제외되는지 검증한다.
 */

interface MenuItemConfig {
  icon: string;
  href?: string;
  download?: string;
  onClick?: unknown;
  children?: unknown;
  destructive?: boolean;
}

type ItemType = 'message' | 'avatar' | 'standalone' | 'sponsoredMessage';

interface BuildOptions {
  itemType?: ItemType;
  isForwardingAllowed?: boolean;
  hasAction?: boolean;
  isChatProtected?: boolean;
  isProtected?: boolean;
  isVideo?: boolean;
  isDownloading?: boolean;
  mediaData?: string;
  fileName?: string;
  canReportAvatar?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  copyImageToClipboard?: (imageUrl?: string) => void;
  showNotification?: () => void;
}

beforeAll(() => {
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: {
      write: jest.fn(),
    },
  });
  Object.defineProperty(window, 'ClipboardItem', {
    configurable: true,
    value: jest.fn(),
  });
});

// 순수 조립 함수 — useMediaViewerActions 의 contextMenuItems 분기와 동일 로직
function buildContextMenuItems(opts: BuildOptions): MenuItemConfig[] {
  const {
    itemType = 'message',
    isForwardingAllowed = true,
    hasAction = false,
    isChatProtected = false,
    isProtected = false,
    isVideo = false,
    isDownloading = false,
    mediaData,
    fileName,
    canReportAvatar = false,
    canUpdate = false,
    canDelete = false,
    copyImageToClipboard,
    showNotification,
  } = opts;

  const items: MenuItemConfig[] = [];
  const isMessage = itemType === 'message';

  // Forward
  if (isMessage && isForwardingAllowed && !hasAction && !isChatProtected) {
    items.push({ icon: 'forward', children: 'Forward' });
  }

  // Download
  if (!isProtected && itemType !== 'standalone' && itemType !== 'sponsoredMessage') {
    if (isVideo) {
      items.push({ icon: isDownloading ? 'close' : 'download', children: isDownloading ? 'Downloading' : 'Download' });
    } else {
      items.push({ icon: 'download', href: mediaData, download: fileName, children: 'Download' });
    }
  }

  // Copy image to clipboard
  if (mediaData && !isVideo && !isProtected) {
    items.push({
      icon: 'copy',
      children: lang('lng_context_copy_image'),
      onClick: () => {
        copyImageToClipboard?.(mediaData);
        showNotification?.();
      },
    });
  }

  // Zoom In (always)
  items.push({ icon: 'zoom-in', children: 'ZoomIn' });

  // Zoom Out (always)
  items.push({ icon: 'zoom-out', children: 'ZoomOut' });

  // Report (avatar only)
  if (canReportAvatar) {
    items.push({ icon: 'flag', children: 'Report' });
  }

  // Set Main Photo (avatar only, canUpdate)
  if (canUpdate) {
    items.push({ icon: 'copy-media', children: 'SetMainPhoto' });
  }

  // Delete (destructive)
  if (canDelete) {
    items.push({ icon: 'delete', children: 'Delete', destructive: true });
  }

  // Close (always)
  items.push({ icon: 'close', children: 'Close' });

  return items;
}

// ---- Helper ----

const langMap = {
  lng_context_copy_image: '이미지 복사',
} as const;

function lang(key: keyof typeof langMap) {
  return langMap[key];
}

function icons(items: MenuItemConfig[]) {
  return items.map((i) => i.icon);
}

// ---- Tests ----

describe('buildContextMenuItems (MediaViewer 컨텍스트 메뉴 항목 조립)', () => {
  describe('photo/message (일반 사진 메시지)', () => {
    it('isForwardingAllowed=true → forward 포함', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isForwardingAllowed: true,
        mediaData: 'blob:x',
      });
      expect(icons(items)).toContain('forward');
    });

    it('isForwardingAllowed=false → forward 미포함', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isForwardingAllowed: false,
        mediaData: 'blob:x',
      });
      expect(icons(items)).not.toContain('forward');
    });

    it('isChatProtected=true → forward 미포함', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isForwardingAllowed: true,
        isChatProtected: true,
        mediaData: 'blob:x',
      });
      expect(icons(items)).not.toContain('forward');
    });

    it('hasAction=true(액션 메시지) → forward 미포함', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isForwardingAllowed: true,
        hasAction: true,
        mediaData: 'blob:x',
      });
      expect(icons(items)).not.toContain('forward');
    });

    it('isProtected=false → download 포함', () => {
      const items = buildContextMenuItems({ itemType: 'message', mediaData: 'blob:x' });
      expect(icons(items)).toContain('download');
    });

    it('mediaData가 있는 이미지 → 언어팩 이미지 복사 라벨 포함', () => {
      const items = buildContextMenuItems({ itemType: 'message', mediaData: 'blob:x' });
      expect(items).toContainEqual(expect.objectContaining({
        icon: 'copy',
        children: lang('lng_context_copy_image'),
      }));
    });

    it('이미지 복사 클릭 → 현재 mediaData URL로 복사 호출', () => {
      const copyImageToClipboard = jest.fn();
      const showNotification = jest.fn();
      const items = buildContextMenuItems({
        itemType: 'message',
        mediaData: 'blob:current-image',
        copyImageToClipboard,
        showNotification,
      });
      const copyItem = items.find((item) => item.children === lang('lng_context_copy_image'));

      expect(copyItem).toBeDefined();
      (copyItem!.onClick as () => void)();
      expect(copyImageToClipboard).toHaveBeenCalledWith('blob:current-image');
      expect(showNotification).toHaveBeenCalledTimes(1);
    });

    it('isProtected=true → download 미포함', () => {
      const items = buildContextMenuItems({ itemType: 'message', isProtected: true, mediaData: 'blob:x' });
      expect(icons(items)).not.toContain('download');
      expect(items.find((item) => item.children === lang('lng_context_copy_image'))).toBeUndefined();
    });

    it('zoom-in, zoom-out, close 항상 포함', () => {
      const items = buildContextMenuItems({});
      expect(icons(items)).toContain('zoom-in');
      expect(icons(items)).toContain('zoom-out');
      expect(icons(items)).toContain('close');
    });

    it('canDelete=false → delete 미포함', () => {
      const items = buildContextMenuItems({ canDelete: false });
      expect(icons(items)).not.toContain('delete');
    });

    it('canDelete=true → delete 포함(destructive)', () => {
      const items = buildContextMenuItems({ canDelete: true });
      const del = items.find((i) => i.icon === 'delete');
      expect(del).toBeDefined();
      expect(del!.destructive).toBe(true);
    });
  });

  describe('video/message', () => {
    it('isVideo=true, isDownloading=false → download 아이콘 (영상 다운로드 버튼)', () => {
      const items = buildContextMenuItems({ itemType: 'message', isVideo: true });
      expect(icons(items)).toContain('download');
      expect(items.find((item) => item.children === lang('lng_context_copy_image'))).toBeUndefined();
    });

    it('isVideo=true, isDownloading=true → close 아이콘 (취소 버튼)', () => {
      const items = buildContextMenuItems({ itemType: 'message', isVideo: true, isDownloading: true });
      // first 'close' would be the download-cancel, last 'close' is the viewer close
      const closePairs = items.filter((i) => i.icon === 'close');
      expect(closePairs.length).toBe(2);
    });
  });

  describe('avatar', () => {
    it('canReportAvatar=true → flag 포함', () => {
      const items = buildContextMenuItems({ itemType: 'avatar', canReportAvatar: true });
      expect(icons(items)).toContain('flag');
    });

    it('canReportAvatar=false → flag 미포함', () => {
      const items = buildContextMenuItems({ itemType: 'avatar', canReportAvatar: false });
      expect(icons(items)).not.toContain('flag');
    });

    it('canUpdate=true → copy-media 포함', () => {
      const items = buildContextMenuItems({ itemType: 'avatar', canUpdate: true });
      expect(icons(items)).toContain('copy-media');
    });

    it('canUpdate=false → copy-media 미포함', () => {
      const items = buildContextMenuItems({ itemType: 'avatar', canUpdate: false });
      expect(icons(items)).not.toContain('copy-media');
    });

    it('avatar는 forward 미포함(isMessage=false)', () => {
      const items = buildContextMenuItems({ itemType: 'avatar' });
      expect(icons(items)).not.toContain('forward');
    });
  });

  describe('protected content', () => {
    it('isProtected=true → download 미포함 (forward는 isChatProtected로 별도 제어)', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isProtected: true,
        isForwardingAllowed: true,
        mediaData: 'blob:x',
      });
      // forward는 isProtected 와 무관 — isChatProtected=false 이므로 포함됨
      expect(icons(items)).toContain('forward');
      expect(icons(items)).not.toContain('download');
    });

    it('isChatProtected=true, isProtected=true → forward, download 모두 미포함', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isProtected: true,
        isChatProtected: true,
        isForwardingAllowed: true,
        mediaData: 'blob:x',
      });
      expect(icons(items)).not.toContain('forward');
      expect(icons(items)).not.toContain('download');
    });

    it('isProtected=true여도 zoom/close 포함', () => {
      const items = buildContextMenuItems({ isProtected: true });
      expect(icons(items)).toContain('zoom-in');
      expect(icons(items)).toContain('zoom-out');
      expect(icons(items)).toContain('close');
    });
  });

  describe('standalone / sponsoredMessage', () => {
    it('standalone → download 미포함', () => {
      const items = buildContextMenuItems({ itemType: 'standalone' });
      expect(icons(items)).not.toContain('download');
    });

    it('sponsoredMessage → download 미포함', () => {
      const items = buildContextMenuItems({ itemType: 'sponsoredMessage' });
      expect(icons(items)).not.toContain('download');
    });
  });

  describe('항목 순서', () => {
    it('forward → download → copy → zoom-in → zoom-out → close 순서', () => {
      const items = buildContextMenuItems({
        itemType: 'message',
        isForwardingAllowed: true,
        mediaData: 'blob:x',
      });
      const iconList = icons(items);
      const fi = iconList.indexOf('forward');
      const di = iconList.indexOf('download');
      const copyIdx = iconList.indexOf('copy');
      const zi = iconList.indexOf('zoom-in');
      const zo = iconList.indexOf('zoom-out');
      const ci = iconList.lastIndexOf('close');
      expect(fi).toBeLessThan(di);
      expect(di).toBeLessThan(copyIdx);
      expect(copyIdx).toBeLessThan(zi);
      expect(zi).toBeLessThan(zo);
      expect(zo).toBeLessThan(ci);
    });

    it('delete는 close 바로 앞', () => {
      const items = buildContextMenuItems({ canDelete: true });
      const iconList = icons(items);
      const delIdx = iconList.lastIndexOf('delete');
      const closeIdx = iconList.lastIndexOf('close');
      expect(delIdx).toBe(closeIdx - 1);
    });
  });
});
