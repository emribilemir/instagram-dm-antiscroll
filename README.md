# Instagram DM Anti-Scroll

A Tampermonkey/Violentmonkey userscript that prevents Instagram Direct Messages from automatically scrolling to the bottom when replying to older messages.

## Installation
- [Greasy Fork Download Link](https://greasyfork.org/tr/scripts/568659-instagram-dm-anti-scroll-reply-mode)
- [GitHub Repository](https://github.com/emribilemir/instagram-dm-antiscroll/)

## Features
- **Instant Detection**: Tracks "Replying to..." text mutations in real-time.
- **Precision Scroll Lock**: Compensates for `column-reverse` layout and `scrollHeight` changes to keep your view perfectly stable.
- **Early Release**: Automatically releases the scroll lock as soon as the chat stabilizes (usually ~400ms).
- **Universal Compatibility**: Uses `@inject-into page` to bypass sandbox restrictions.

## Manual Installation
1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. [Download or Copy](https://github.com/emribilemir/instagram-dm-antiscroll/blob/master/instagram-dm-antiscroll.user.js) the contents of `instagram-dm-antiscroll.user.js` and paste it into the editor.
3. Save (Ctrl+S) and refresh your Instagram DM page.

## License
MIT
