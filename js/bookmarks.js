/**
 * Bookmarks & Speed Dial Manager
 */

class BookmarkManager {
  constructor(renderCallback) {
    this.bookmarks = StorageManager.getBookmarks();
    this.currentCategory = 'All';
    this.renderCallback = renderCallback;
  }

  getFilteredBookmarks() {
    if (this.currentCategory === 'All') return this.bookmarks;
    return this.bookmarks.filter(b => b.category === this.currentCategory);
  }

  addBookmark(title, url, category = 'Core', color = '#10b981') {
    if (!title || !url) return;
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('file://')) {
      cleanUrl = 'https://' + cleanUrl;
    }

    const domain = this.extractDomain(cleanUrl);
    const initial = title.trim().charAt(0).toUpperCase();

    const newBookmark = {
      id: 'b-' + Date.now(),
      title: title.trim(),
      url: cleanUrl,
      category,
      icon: initial,
      domain,
      color
    };

    this.bookmarks.push(newBookmark);
    this.save();
  }

  deleteBookmark(id) {
    this.bookmarks = this.bookmarks.filter(b => b.id !== id);
    this.save();
  }

  extractDomain(url) {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return '';
    }
  }

  setCategory(category) {
    this.currentCategory = category;
    if (this.renderCallback) this.renderCallback();
  }

  save() {
    StorageManager.saveBookmarks(this.bookmarks);
    if (this.renderCallback) this.renderCallback();
  }
}

window.BookmarkManager = BookmarkManager;
